import React, { useState, useRef, useCallback, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { RefreshCw, Plane, Ship, Orbit, Radio, X, Info, Maximize2, Minimize2 } from "lucide-react";
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

const GIBS_LAYERS = [
  { id: 'true', name: 'TRUE COLOR', url: (date: string) => `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=MODIS_Terra_CorrectedReflectance_TrueColor&FORMAT=image/jpeg&WIDTH=1200&HEIGHT=800&CRS=CRS:84&BBOX=25,10,65,45&TIME=${date}` },
  { id: 'thermal', name: 'THERMAL IR', url: (date: string) => `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=MODIS_Terra_Thermal_Anomalies_All&FORMAT=image/jpeg&WIDTH=1200&HEIGHT=800&CRS=CRS:84&BBOX=25,10,65,45&TIME=${date}` },
  { id: 'fire', name: 'FIRE/HEAT', url: (date: string) => `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=VIIRS_SNPP_Fires_All&FORMAT=image/png&WIDTH=1200&HEIGHT=800&CRS=CRS:84&BBOX=25,10,65,45&TIME=${date}` },
  { id: 'aod', name: 'SMOKE/DUST', url: (date: string) => `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=MODIS_Terra_Aerosol&FORMAT=image/png&WIDTH=1200&HEIGHT=800&CRS=CRS:84&BBOX=25,10,65,45&TIME=${date}` },
];

// Draggable resizable panel component
function DraggablePanel({ title, color, onClose, children, defaultPos, defaultSize }: {
  title: string; color: string; onClose: () => void;
  children: React.ReactNode;
  defaultPos: { x: number; y: number };
  defaultSize: { w: number; h: number };
}) {
  const [pos, setPos] = useState(defaultPos);
  const [size, setSize] = useState(defaultSize);
  const [maximized, setMaximized] = useState(false);
  const [prevState, setPrevState] = useState({ pos: defaultPos, size: defaultSize });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      setPos({ x: ev.clientX - dragOffset.current.x, y: ev.clientY - dragOffset.current.y });
    };
    const onUp = () => { dragging.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [pos]);

  const toggleMaximize = () => {
    if (maximized) {
      setPos(prevState.pos);
      setSize(prevState.size);
      setMaximized(false);
    } else {
      setPrevState({ pos, size });
      setPos({ x: 10, y: 10 });
      setSize({ w: window.innerWidth - 400, h: window.innerHeight - 100 });
      setMaximized(true);
    }
  };

  const actualPos = maximized ? { x: 10, y: 10 } : pos;
  const actualSize = maximized ? { w: window.innerWidth - 400, h: window.innerHeight - 100 } : size;

  return (
    <div
      ref={panelRef}
      className="absolute z-[2000] flex flex-col"
      style={{ left: actualPos.x, top: actualPos.y, width: actualSize.w, height: actualSize.h, border: `2px solid ${color}`, background: 'rgba(0,0,0,0.97)', boxShadow: `0 0 30px ${color}44`, resize: maximized ? 'none' : 'both', overflow: 'hidden', minWidth: 300, minHeight: 200 }}
    >
      {/* Title bar - drag handle */}
      <div
        onMouseDown={onMouseDown}
        className="flex items-center justify-between px-3 py-2 cursor-move shrink-0 select-none"
        style={{ borderBottom: `1px solid ${color}44`, background: `${color}11` }}
      >
        <span className="font-black text-[11px] tracking-widest" style={{ color }}>{title}</span>
        <div className="flex items-center gap-2">
          <button onClick={toggleMaximize} style={{ color }} className="hover:opacity-70">
            {maximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>
          <button onClick={onClose} style={{ color }} className="hover:text-white"><X className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">{children}</div>
      {/* Resize hint */}
      {!maximized && <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-30" style={{ borderRight: `2px solid ${color}`, borderBottom: `2px solid ${color}` }} />}
    </div>
  );
}

interface IntelMapProps {
  events: IntelligenceEvent[];
  selectedEvent: IntelligenceEvent | null;
  onEventClick: (event: IntelligenceEvent) => void;
}

export default function IntelMap({ events, selectedEvent, onEventClick }: IntelMapProps) {
  const [showVesselLayer, setShowVesselLayer] = useState(false);
  const [showFlightLayer, setShowFlightLayer] = useState(false);
  const [showSatelliteLayer, setShowSatelliteLayer] = useState(false);
  const [showGibsPanel, setShowGibsPanel] = useState(false);
  const [showNoFlyPanel, setShowNoFlyPanel] = useState(false);
  const [showJammingPanel, setShowJammingPanel] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
const mapRef = useRef<any>(null);
const heatLayerRef = useRef<any>(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const [gibsLayer, setGibsLayer] = useState(0);
  const [gibsDate, setGibsDate] = useState(new Date(Date.now() - 86400000).toISOString().split('T')[0]);
  const [gibsZoom, setGibsZoom] = useState(1);

  return (
    <div className="relative w-full h-full bg-black">
      {/* INSTRUCTIONS MODAL */}
      {showInstructions && (
        <div className="absolute inset-0 z-[3000] flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <div className="max-w-lg w-full mx-4 border-2 border-[#00ff41] bg-black p-6 shadow-[0_0_40px_rgba(0,255,65,0.3)] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 bg-[#00ff41] rounded-full animate-pulse" />
              <h2 className="text-[#00ff41] font-black text-lg tracking-widest">⚠️ OPERATOR BRIEFING</h2>
            </div>
            <div className="space-y-3 text-[11px] text-[#00ff41]/80 font-mono">
              <div className="border border-[#00ff41]/30 p-3 bg-[#00ff41]/5">
                <div className="font-black text-[#00ff41] mb-1">🖥️ DISPLAY</div>
                Press <span className="bg-[#00ff41] text-black px-1 font-black">F11</span> for FULL SCREEN
              </div>
              <div className="border border-[#00ff41]/30 p-3 bg-[#00ff41]/5">
                <div className="font-black text-[#00ff41] mb-1">🔄 REFRESH</div>
                Click <span className="bg-[#00ff41] text-black px-1 font-black">SYNC</span> regularly for latest intel. Auto-refreshes every 60s.
              </div>
              <div className="border border-[#00ff41]/30 p-3 bg-[#00ff41]/5">
                <div className="font-black text-[#00ff41] mb-1">🚢 SHIPS + ✈️ FLIGHTS</div>
                Click overlay buttons (top right) to enable live AIS ships and ADS-B flights
              </div>
              <div className="border border-[#00ff41]/30 p-3 bg-[#00ff41]/5">
                <div className="font-black text-[#00ff41] mb-1">🛰️ PANELS</div>
                GIBS, GPS JAM, NO-FLY panels are draggable and resizable — drag title bar to move, drag bottom-right corner to resize
              </div>
              <div className="border border-yellow-500/30 p-3 bg-yellow-500/5">
                <div className="font-black text-yellow-500 mb-1">⚠️ ALERTS</div>
                Threat score above 40% triggers audio alarm + popup alert
              </div>
              <div className="border border-red-500/30 p-3 bg-red-500/5">
                <div className="font-black text-red-500 mb-1">🔴 DISCLAIMER</div>
                Research & educational purposes only
              </div>
            </div>
            <button onClick={() => setShowInstructions(false)} className="mt-4 w-full bg-[#00ff41] text-black font-black py-3 hover:bg-white transition-colors tracking-widest">
              ACKNOWLEDGED — ENTER SYSTEM
            </button>
          </div>
        </div>
      )}

      {/* DRAGGABLE GIBS PANEL */}
      {showGibsPanel && (
        <DraggablePanel title="🛰️ NASA GIBS SATELLITE IMAGERY — MENA REGION" color="#d400ff" onClose={() => setShowGibsPanel(false)} defaultPos={{ x: 60, y: 60 }} defaultSize={{ w: 600, h: 500 }}>
          <div className="p-2 flex gap-1 flex-wrap border-b border-[#d400ff]/20">
            {GIBS_LAYERS.map((l, i) => (
              <button key={l.id} onClick={() => setGibsLayer(i)}
                className={`text-[9px] px-2 py-1 font-black border transition-all ${gibsLayer === i ? 'border-[#d400ff] text-black bg-[#d400ff]' : 'border-[#d400ff]/40 text-[#d400ff]/60 hover:border-[#d400ff]'}`}
              >{l.name}</button>
            ))}
            <input type="date" value={gibsDate} onChange={e => setGibsDate(e.target.value)}
              className="ml-auto text-[9px] bg-black border border-[#d400ff]/40 text-[#d400ff] px-2"
              max={new Date().toISOString().split('T')[0]}
            />
            <div className="flex items-center gap-1 ml-1">
              <button onClick={() => setGibsZoom(z => Math.max(0.5, z - 0.25))} className="text-[#d400ff] border border-[#d400ff]/40 px-2 text-[11px] font-black hover:bg-[#d400ff]/10">−</button>
              <span className="text-[#d400ff] text-[9px]">{Math.round(gibsZoom * 100)}%</span>
              <button onClick={() => setGibsZoom(z => Math.min(3, z + 0.25))} className="text-[#d400ff] border border-[#d400ff]/40 px-2 text-[11px] font-black hover:bg-[#d400ff]/10">+</button>
            </div>
          </div>
          <div className="overflow-auto w-full h-full">
            <img
              src={GIBS_LAYERS[gibsLayer].url(gibsDate)}
              alt="NASA GIBS"
              style={{ transform: `scale(${gibsZoom})`, transformOrigin: 'top left', width: `${100 / gibsZoom}%` }}
              onError={(e) => { (e.target as HTMLImageElement).alt = 'Image unavailable for this date'; }}
            />
          </div>
          <div className="absolute bottom-2 left-2 text-[8px] text-[#d400ff]/40">NASA GIBS • {gibsDate} • Drag to move • Resize from corner</div>
        </DraggablePanel>
      )}

      {/* DRAGGABLE NO-FLY ZONES PANEL */}
      {showNoFlyPanel && (
        <DraggablePanel title="🚫 NO-FLY ZONES & NOTAM — MENA" color="#f97316" onClose={() => setShowNoFlyPanel(false)} defaultPos={{ x: 60, y: 400 }} defaultSize={{ w: 420, h: 380 }}>
          <div className="p-3 text-[11px] font-mono overflow-y-auto h-full">
            <div className="text-orange-500 font-black mb-3">ACTIVE AIRSPACE RESTRICTIONS</div>
            {[
              { zone: "YEMEN FIR", status: "DANGER", detail: "Active conflict zone. All civil aviation suspended over Sanaa FIR. NOTAM YE-A0012/26" },
              { zone: "ISRAEL TMA", status: "ACTIVE NFZ", detail: "NFZ active over northern borders. IDF operations ongoing. NOTAM IL-A0891/26" },
              { zone: "IRAN FIR", status: "RESTRICTED", detail: "Foreign military aircraft require prior permission. NOTAM A0234/26" },
              { zone: "RED SEA", status: "CAUTION", detail: "Houthi drone threat. Airlines advised FL300+. Monitor 121.5MHz" },
              { zone: "IRAQ AIRSPACE", status: "CAUTION", detail: "Coalition ops active. Blocks restricted below FL200. NOTAM IQ-A0445/26" },
              { zone: "PERSIAN GULF", status: "MONITOR", detail: "Iranian ADIZ active. Squawk 7600 incidents reported. NOTAM OMAE/26-044" },
              { zone: "BEIRUT FIR", status: "RESTRICTED", detail: "Lebanese airspace partially restricted. IDF proximity advisory." },
              { zone: "SINAI", status: "CAUTION", detail: "GPS jamming reported. Navigation advisory for overflying aircraft." },
            ].map((item, i) => (
              <div key={i} className={`p-2 mb-2 border-l-4 ${item.status === 'DANGER' ? 'border-red-500 bg-red-500/5' : item.status === 'ACTIVE NFZ' ? 'border-orange-500 bg-orange-500/5' : item.status === 'RESTRICTED' ? 'border-yellow-500 bg-yellow-500/5' : 'border-gray-600 bg-gray-600/5'}`}>
                <div className="flex justify-between mb-1">
                  <span className="font-black text-white text-[10px]">{item.zone}</span>
                  <span className={`text-[9px] font-black px-1 ${item.status === 'DANGER' ? 'text-red-500' : item.status === 'ACTIVE NFZ' ? 'text-orange-500' : item.status === 'RESTRICTED' ? 'text-yellow-500' : 'text-gray-400'}`}>{item.status}</span>
                </div>
                <div className="text-[9px] opacity-70">{item.detail}</div>
              </div>
            ))}
            <div className="text-[8px] opacity-30 mt-2">NOTAM aggregation • Updated every 60 min • For reference only</div>
          </div>
        </DraggablePanel>
      )}

      {/* DRAGGABLE GPS JAMMING PANEL */}
      {showJammingPanel && (
        <DraggablePanel title="📡 GPS JAMMING/SPOOFING — LIVE" color="#eab308" onClose={() => setShowJammingPanel(false)} defaultPos={{ x: 500, y: 400 }} defaultSize={{ w: 500, h: 380 }}>
          <iframe src="https://gpsjam.org/?lat=25&lon=45&z=5" className="w-full h-full border-0" title="GPS Jamming" />
        </DraggablePanel>
      )}

      {/* DRAGGABLE SATELLITE LIVE PANEL */}
      {showSatelliteLayer && (
        <DraggablePanel title="🛰️ LIVE SATELLITE TRACKER — N2YO" color="#d400ff" onClose={() => setShowSatelliteLayer(false)} defaultPos={{ x: 300, y: 60 }} defaultSize={{ w: 500, h: 420 }}>
          <iframe src="https://www.n2yo.com/passes/?s=25544" className="w-full h-full border-0" title="Live Satellites" />
        </DraggablePanel>
      )}

      {/* VesselFinder overlay */}
      {showVesselLayer && (
        <div className="absolute inset-0 z-[900]">
          <iframe src="https://www.vesselfinder.com/aismap?zoom=6&lat=25&lon=55&width=100%25&height=100%25&names=true&fleet=false"
            className="w-full h-full border-0" style={{ mixBlendMode: 'screen', opacity: 0.85 }} title="VesselFinder" />
        </div>
      )}

      {/* ADSBExchange overlay */}
      {showFlightLayer && (
        <div className="absolute inset-0 z-[850]">
          <iframe src="https://globe.adsbexchange.com/?lat=25&lon=50&zoom=5"
            className="w-full h-full border-0" style={{ mixBlendMode: 'screen', opacity: 0.9 }} title="Flights" />
        </div>
      )}

      {events.length === 0 && (
        <div className="absolute inset-0 z-[800] flex flex-col items-center justify-center bg-black/80">
          <RefreshCw className="w-12 h-12 text-[var(--color-brand-primary)] animate-spin" />
          <div className="mt-4 text-[10px] tracking-[0.3em] font-black animate-pulse">ESTABLISHING DATA LINK</div>
          <div className="text-[8px] opacity-40 mt-1">ADS-B / AIS / EONET / NEWS-CORP</div>
        </div>
      )}

      <MapContainer center={[24.0, 50.0]} zoom={5} className="w-full h-full" zoomControl={false}
  ref={mapRef}
  whenCreated={(map: any) => { mapRef.current = map; }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
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
                eventHandlers={{ click: () => onEventClick(event) }}>
                <Popup>
                  <div className="text-xs bg-[#050505] text-[#00ff41] p-2 border border-[#00ff41]/20">
                    <div className="font-bold border-b border-[#00ff41]/20 pb-1 mb-1">{event.label}</div>
                    <div className="opacity-70">{event.type.toUpperCase()} | {new Date(event.timestamp).toLocaleTimeString()}</div>
                    <div className="mt-1 text-[10px]">{event.details}</div>
                  </div>
                </Popup>
              </Marker>
              {event.path && event.path.length > 1 && (
                <Polyline positions={event.path} pathOptions={{ color, weight: 1.5, opacity: 0.6, dashArray: "4, 8" }} />
              )}
              {event.intensity > 0.6 && (
                <Circle center={[event.lat, event.lng]} radius={30000 * event.intensity}
                  pathOptions={{ color: event.intensity > 0.8 ? "#ff4444" : "#ffaa00", fillColor: event.intensity > 0.8 ? "#ff4444" : "#ffaa00", fillOpacity: 0.1, weight: 1, dashArray: "5, 5" }} />
              )}
            </React.Fragment>
          );
        })}
      </MapContainer>

      {/* RIGHT SIDE BUTTONS */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <div className="hud-bg hud-border p-2 text-[10px] uppercase text-[var(--color-brand-primary)]">Grid: Active</div>
        <div className="hud-bg hud-border p-2 text-[10px] uppercase text-[#555]">Sat: Offline</div>

        <button onClick={() => setShowInstructions(true)} className="px-3 py-2 text-[10px] font-black uppercase border-2 border-[#00ff41]/50 text-[#00ff41]/70 bg-[#00ff41]/5 hover:bg-[#00ff41]/20 transition-all flex items-center gap-2">
          <Info className="w-4 h-4" /> BRIEFING
        </button>

        <button onClick={() => setShowGibsPanel(!showGibsPanel)}
          className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest border-2 transition-all flex items-center gap-2 shadow-lg ${showGibsPanel ? 'border-[#d400ff] text-black bg-[#d400ff]' : 'border-[#d400ff] text-[#d400ff] bg-[#d400ff]/10 animate-pulse'}`}>
          <Orbit className="w-4 h-4" /> {showGibsPanel ? '🔴 GIBS: OPEN' : '🛰️ GIBS IMAGERY'}
        </button>

        <button onClick={() => setShowVesselLayer(!showVesselLayer)}
          className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest border-2 transition-all flex items-center gap-2 shadow-lg ${showVesselLayer ? 'border-[#00eaff] text-black bg-[#00eaff]' : 'border-[#00eaff] text-[#00eaff] bg-[#00eaff]/10 animate-pulse'}`}>
          <Ship className="w-4 h-4" /> {showVesselLayer ? '🔴 AIS: LIVE' : '🚢 SHIPS LIVE'}
        </button>

        <button onClick={() => setShowFlightLayer(!showFlightLayer)}
          className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest border-2 transition-all flex items-center gap-2 shadow-lg ${showFlightLayer ? 'border-[#00ff41] text-black bg-[#00ff41]' : 'border-[#00ff41] text-[#00ff41] bg-[#00ff41]/10 animate-pulse'}`}>
          <Plane className="w-4 h-4" /> {showFlightLayer ? '🔴 FLIGHTS: LIVE' : '✈️ FLIGHTS LIVE'}
        </button>

        <button onClick={() => setShowSatelliteLayer(!showSatelliteLayer)}
  className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest border-2 transition-all flex items-center gap-2 shadow-lg ${showSatelliteLayer ? 'border-[#d400ff] text-black bg-[#d400ff]' : 'border-[#d400ff] text-[#d400ff] bg-[#d400ff]/10 animate-pulse'}`}>
  <Orbit className="w-4 h-4" /> {showSatelliteLayer ? '🔴 N2YO: LIVE' : '🛸 N2YO LIVE'}
</button>

        <button onClick={() => setShowNoFlyPanel(!showNoFlyPanel)}
          className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest border-2 transition-all flex items-center gap-2 ${showNoFlyPanel ? 'border-orange-500 text-black bg-orange-500' : 'border-orange-500 text-orange-500 bg-orange-500/10 hover:bg-orange-500/20'}`}>
          <Plane className="w-4 h-4" /> 🚫 NO-FLY ZONES
        </button>

        <button onClick={() => setShowJammingPanel(!showJammingPanel)}
          className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest border-2 transition-all flex items-center gap-2 ${showJammingPanel ? 'border-yellow-500 text-black bg-yellow-500' : 'border-yellow-500 text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20'}`}>
          <Radio className="w-4 h-4" /> 📡 GPS JAMMING
        </button>
      </div>
    </div>
  );
}
