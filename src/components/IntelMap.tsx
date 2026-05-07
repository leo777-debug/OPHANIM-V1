import React from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { RefreshCw } from "lucide-react";
import { IntelligenceEvent } from "../types";

// Fix for default marker icons in Leaflet
const markerIcon = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png";
const markerShadow = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface IntelMapProps {
  events: IntelligenceEvent[];
  selectedEvent: IntelligenceEvent | null;
  onEventClick: (event: IntelligenceEvent) => void;
}

export default function IntelMap({ events, selectedEvent, onEventClick }: IntelMapProps) {
  return (
    <div className="relative w-full h-full bg-black">
      {events.length === 0 && (
        <div className="absolute inset-0 z-[2000] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative">
            <RefreshCw className="w-12 h-12 text-[var(--color-brand-primary)] animate-spin" />
            <div className="absolute inset-0 text-[var(--color-brand-primary)]/20 animate-ping">
              <RefreshCw className="w-12 h-12" />
            </div>
          </div>
          <div className="mt-4 text-[10px] tracking-[0.3em] font-black animate-pulse">ESTABLISHING DATA LINK</div>
          <div className="text-[8px] opacity-40 mt-1 uppercase">ADS-B / AIS / EONET / NEWS-CORP</div>
        </div>
      )}

      <MapContainer
        center={[24.0, 50.0]}
        zoom={5}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {events.map((event) => (
          <React.Fragment key={event.id}>
            <Marker 
              position={[event.lat, event.lng]}
              eventHandlers={{
                click: () => onEventClick(event),
              }}
            >
              <Popup className="tactical-popup">
                <div className="text-xs bg-[#050505] text-[#00ff41] p-2 border border-[#00ff41]/20">
                  <div className="font-bold border-b border-[#00ff41]/20 pb-1 mb-1">{event.label}</div>
                  <div className="opacity-70">{event.type.toUpperCase()} | {new Date(event.timestamp).toLocaleTimeString()}</div>
                  <div className="mt-1 text-[10px] leading-tight">{event.details}</div>
                </div>
              </Popup>
            </Marker>
            
            {/* Threat radius visualization */}
            {event.intensity > 0.6 && (
              <Circle
                center={[event.lat, event.lng]}
                radius={30000 * event.intensity}
                pathOptions={{
                  color: event.intensity > 0.8 ? "#ff4444" : "#ffaa00",
                  fillColor: event.intensity > 0.8 ? "#ff4444" : "#ffaa00",
                  fillOpacity: 0.15,
                  weight: 1,
                  dashArray: "5, 5"
                }}
              />
            )}
          </React.Fragment>
        ))}
      </MapContainer>

      {/* Map Overlay Controls */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <div className="hud-bg hud-border p-2 text-[10px] uppercase tracking-widest text-[var(--color-brand-primary)]">
          Grid: Active
        </div>
        <div className="hud-bg hud-border p-2 text-[10px] uppercase tracking-widest text-[#555]">
          Sat: Offline
        </div>
      </div>
    </div>
  );
}
