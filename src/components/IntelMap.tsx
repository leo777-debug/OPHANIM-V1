import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { RefreshCw, Plane, Ship, Orbit, Radio, X, Info } from "lucide-react";
import { IntelligenceEvent } from "../types";
import { renderToString } from "react-dom/server";

const markerIcon = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png";
const markerShadow = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png";
const DefaultIcon = L.icon({ iconUrl: markerIcon, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const createTacticalIcon = (type: string, color: string = "#00ff41") => {
  let iconComponent = <Radio className="w-5 h-5" />;
  if (type === "aircraft") iconComponent = <Plane className="w-5 h-5" />;
  if (type === "vessel") iconComponent = <Ship className="w-5 h-5" />;
  if (type === "satellite") iconComponent = <Orbit className="w-5 h-5" />;
  return L.divIcon({
    html: `<div style="color: ${color}; filter: drop-shadow(0 0 5px ${color}44);">${renderToString(iconComponent)}</div>`,
    className: "tactical-div-icon", iconSize: [20, 20], iconAnchor: [10, 10],
  });
};

interface IntelMapProps {
  events: IntelligenceEvent[];
  selectedEvent: IntelligenceEvent | null;
  onEventClick: (event: IntelligenceEvent) => void;
}

// GIBS image dates for MENA region
const GIBS_LAYERS = [
  { id: 'true', name: 'TRUE COLOR', url: (date: string) => `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=MODIS_Terra_CorrectedReflectance_TrueColor&FORMAT=image/jpeg&WIDTH=800&HEIGHT=600&CRS=CRS:84&BBOX=25,10,65,45&TIME=${date}` },
  { id: 'thermal', name: 'THERMAL IR', url: (date: string) => `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=MODIS_Terra_Thermal_Anomalies_All&FORMAT=image/jpeg&WIDTH=800&HEIGHT=600&CRS=CRS:84&BBOX=25,10,65,45&TIME=${date}` },
  { id: 'fire', name: 'FIRE/HEAT', url: (date: string) => `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=VIIRS_SNPP_Fires_All&FORMAT=image/png&WIDTH=800&HEIGHT=600&CRS=CRS:84&BBOX=25,10,65,45&TIME=${date}` },
];

export default function IntelMap({ events, selectedEvent, onEventClick }: IntelMapProps) {
  const [showVesselLayer, setShowVesselLayer] = useState(false);
  const [showGibsPanel, setShowGibsPanel] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [gibsLayer, setGibsLayer] = useState(0);
  const [gibsDate, setGibsDate] = useState(new Date(Date.now() - 86400000).toISOString().split('T')[0]);

  return (
    <div className="relative w-full h-full bg-black">
      {/* MUST READ INSTRUCTIONS MODAL */}
      {showInstructions && (
        <div className="absolute inset-0 z-[3000] flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <div className="max-w-lg w-full mx-4 border-2 border-[#00ff41] bg-black p-6 shadow-[0_0_40px_rgba(0,255,65,0.3)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#00ff41] rounded-full animate-pulse" />
                <h2 className="text-[#00ff41] font-black text-lg tracking-widest">⚠️ MUST READ — OPERATOR BRIEFING</h2>
              </div>
            </div>
            <div className="space-y-3 text-[11px] text-[#00ff41]/80 font-mono">
              <div className="border border-[#00ff41]/30 p-3 bg-[#00ff41]/5">
                <div className="font-black text-[#00ff41] mb-1">🖥️ DISPLAY</div>
                Press <span className="bg-[#00ff41] text-black px-1 font-black">F11</span> for FULL SCREEN mode for optimal tactical view
              </div>
              <div className="border border-[#00ff41]/30 p-3 bg-[#00ff41]/5">
                <div className="font-black text-[#00ff41] mb-1">🔄 REFRESH</div>
                Data refreshes every 60 seconds automatically. Press <span className="bg-[#00ff41] text-black px-1 font-black">SYNC</span> or <span className="bg-[#00ff41] text-black px-1 font-black">REFRESH</span> manually for latest intel
              </div>
              <div className="border border-[#00ff41]/30 p-3 bg-[#00ff41]/5">
                <div className="font-black text-[#00ff41] mb-1">🚢 LIVE SHIPS</div>
                Click <span className="bg-[#00eaff] text-black px-1 font-black">🚢 SHIPS LIVE</span> button on map for real AIS vessel tracking
              </div>
              <div className="border border-[#00ff41]/30 p-3 bg-[#00ff41]/5">
                <div className="font-black text-[#00ff41] mb-1">🛰️ SATELLITE IMAGERY</div>
                Click <span className="bg-[#d400ff] text-black px-1 font-black">GIBS IMAGERY</span> to view NASA satellite images of MENA
              </div>
              <div className="border border-yellow-500/30 p-3 bg-yellow-500/5">
                <div className="font-black text-yellow-500 mb-1">⚠️ THREAT ALERTS</div>
                Threat score above 40% triggers automatic alert. Click IN-DEPTH ASI-EVOLVE REVIEW for full analysis
              </div>
              <div className="border border-red-500/30 p-3 bg-red-500/5">
                <div className="font-black text-red-500 mb-1">🔴 DISCLAIMER</div>
                For research and educational purposes only. Data sources: USGS, NASA, GDELT, N2YO, AISStream
              </div>
            </div>
            <button
              onClick={() => setShowInstructions(false)}
              className="mt-4 w-full bg-[#00ff41] text-black font-black py-3 hover:bg-white transition-colors tracking-widest"
            >
              ACKNOWLEDGED — ENTER SYSTEM
            </button>
          </div>
        </div>
      )}

      {/* GIBS SATELLITE IMAGERY PANEL */}
      {showGibsPanel && (
        <div className="absolute top-4 left-4 z-[2000] w-[500px] border-2 border-[#d400ff] bg-black/95 shadow-[0_0_30px_rgba(212,0,255,0.3)]">
          <div className="flex items-center justify-between p-3 border-b border-[#d400ff]/30">
            <span className="text-[#d400ff] font-black text-[11px] tracking-widest">🛰️ NASA GIBS SATELLITE IMAGERY — MENA REGION</span>
            <button onClick={() => setShowGibsPanel(false)} className="text-[#d400ff] hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <div className="p-3 flex gap-2 border-b border-[#d400ff]/20">
            {GIBS_LAYERS.map((l, i) => (
              <button key={l.id} onClick={() => setGibsLayer(i)}
                className={`text-[9px] px-2 py-1 font-black border transition-all ${gibsLayer === i ? 'border-[#d400ff] text-black bg-[#d400ff]' : 'border-[#d400ff]/40 text-[#d400ff]/60 hover:border-[#d400ff]'}`}
              >{l.name}</button>
            ))}
            <input type="date" value={gibsDate} onChange={e => setGibsDate(e.target.value)}
              className="ml-auto text-[9px] bg-black border border-[#d400ff]/40 text-[#d400ff] px-2"
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="relative">
            <img
              src={GIBS_LAYERS[gibsLayer].url(gibsDate)}
              alt="NASA GIBS Satellite Imagery"
              className="w-full"
              onError={(e) => { (e.target as HTMLImageElement).src = ''; }}
            />
            <div className="absolute bottom-2 left-2 text-[8px] text-[#d400ff]/60">NASA GIBS • {gibsDate} • MENA REGION</div>
          </div>
          <div className="p-2 text-[8px] text-[#d400ff]/40 border-t border-[#d400ff]/20">
            TRUE COLOR: Normal view • THERMAL IR: Heat signatures, fires, explosions • FIRE/HEAT: Active burn detection
          </div>
        </div>
      )}

      {events.length === 0 && (
        <div className="absolute inset-0 z-[2000] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
          <RefreshCw className="w-12 h-12 text-[var(--color-brand-primary)] animate-spin" />
          <div className="mt-4 text-[10px] tracking-[0.3em] font-black animate-pulse">ESTABLISHING DATA LINK</div>
          <div className="text-[8px] opacity-40 mt-1 uppercase">ADS-B / AIS / EONET / NEWS-CORP</div>
        </div>
      )}

      {/* VesselFinder Live Ship Overlay */}
      {showVesselLayer && (
        <div className="absolute inset-0 z-[900]">
          <iframe
            src="https://www.vesselfinder.com/aismap?zoom=6&lat=25&lon=55&width=100%25&height=100%25&names=true&fleet=false"
            className="w-full h-full border-0"
            style={{ mixBlendMode: 'screen', opacity: 0.85 }}
            title="VesselFinder Live Ships"
          />
        </div>
      )}

      <MapContainer center={[24.0, 50.0]} zoom={5} className="w-full h-full" zoomControl={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {events.map((event) => {
          const color = event.intensity > 0.8 ? "#ff4444" :
            event.type === 'vessel' ? '#00eaff' :
            event.type === 'satellite' ? '#d400ff' :
            event.type === 'conflict' ? '#ff8800' : "#00ff41";
          return (
            <React.Fragment key={event.id}>
              <Marker position={[event.lat, event.lng]} icon={createTacticalIcon(event.type, color)}
                eventHandlers={{ click: () => onEventClick(event) }}
              >
                <Popup className="tactical-popup">
                  <div className="text-xs bg-[#050505] text-[#00ff41] p-2 border border-[#00ff41]/20">
                    <div className="font-bold border-b border-[#00ff41]/20 pb-1 mb-1">{event.label}</div>
                    <div className="opacity-70">{event.type.toUpperCase()} | {new Date(event.timestamp).toLocaleTimeString()}</div>
                    <div className="mt-1 text-[10px] leading-tight">{event.details}</div>
                  </div>
                </Popup>
              </Marker>
              {event.path && event.path.length > 1 && (
                <Polyline positions={event.path} pathOptions={{ color, weight: 1.5, opacity: 0.6, dashArray: "4, 8" }} />
              )}
              {event.intensity > 0.6 && (
                <Circle center={[event.lat, event.lng]} radius={30000 * event.intensity}
                  pathOptions={{ color: event.intensity > 0.8 ? "#ff4444" : "#ffaa00", fillColor: event.intensity > 0.8 ? "#ff4444" : "#ffaa00", fillOpacity: 0.15, weight: 1, dashArray: "5, 5" }}
                />
              )}
            </React.Fragment>
          );
        })}
      </MapContainer>

      {/* Map Overlay Controls */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <div className="hud-bg hud-border p-2 text-[10px] uppercase tracking-widest text-[var(--color-brand-primary)]">Grid: Active</div>
        <div className="hud-bg hud-border p-2 text-[10px] uppercase tracking-widest text-[#555]">Sat: Offline</div>

        {/* Instructions button */}
        <button onClick={() => setShowInstructions(true)}
          className="px-3 py-2 text-[10px] font-black uppercase border-2 border-[#00ff41]/50 text-[#00ff41]/70 bg-[#00ff41]/5 hover:bg-[#00ff41]/20 transition-all flex items-center gap-2"
        >
          <Info className="w-4 h-4" /> BRIEFING
        </button>

        {/* GIBS Imagery */}
        <button onClick={() => setShowGibsPanel(!showGibsPanel)}
          className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest border-2 transition-all flex items-center gap-2 shadow-lg ${
            showGibsPanel
              ? 'border-[#d400ff] text-black bg-[#d400ff] shadow-[0_0_15px_rgba(212,0,255,0.6)]'
              : 'border-[#d400ff] text-[#d400ff] bg-[#d400ff]/10 hover:bg-[#d400ff]/20 shadow-[0_0_8px_rgba(212,0,255,0.3)] animate-pulse'
          }`}
        >
          <Orbit className="w-4 h-4" />
          {showGibsPanel ? '🔴 GIBS: OPEN' : '🛰️ GIBS IMAGERY'}
        </button>

        {/* Ships */}
        <button onClick={() => setShowVesselLayer(!showVesselLayer)}
          className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest border-2 transition-all flex items-center gap-2 shadow-lg ${
            showVesselLayer
              ? 'border-[#00eaff] text-black bg-[#00eaff] shadow-[0_0_15px_rgba(0,234,255,0.6)]'
              : 'border-[#00eaff] text-[#00eaff] bg-[#00eaff]/10 hover:bg-[#00eaff]/20 shadow-[0_0_8px_rgba(0,234,255,0.3)] animate-pulse'
          }`}
        >
          <Ship className="w-4 h-4" />
          {showVesselLayer ? '🔴 AIS: LIVE' : '🚢 SHIPS LIVE'}
        </button>

        {/* GPS Jamming */}
        <a href="https://gpsjam.org/?lat=25&lon=45&z=5" target="_blank" rel="noreferrer"
          className="px-3 py-2 text-[10px] font-black uppercase tracking-widest border-2 border-yellow-500 text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20 shadow-[0_0_8px_rgba(234,179,8,0.3)] transition-all flex items-center gap-2"
        >
          <Radio className="w-4 h-4" /> 📡 GPS JAMMING
        </a>
      </div>
    </div>
  );
}
