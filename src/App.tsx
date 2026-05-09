
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Activity, 
  AlertTriangle, 
  Layers, 
  Shield, 
  Cpu, 
  Terminal,
  Crosshair,
  Wifi,
  Globe,
  Newspaper,
  Database,
  BrainCircuit,
  RefreshCw,
  Search,
  Plane,
  Ship,
  Orbit,
  Zap,
  Flame,
  Radio
} from "lucide-react";
import IntelMap from "./components/IntelMap";
import { IntelligenceEvent, AnalysisResult, CognitionLesson, NewsItem } from "./types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Papa from "papaparse";
import Auth from "./components/Auth";
import { supabase } from "./lib/supabase";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_BASE = (import.meta as any).env.VITE_API_URL || "";

export type MapLayers = {
  aircraft: boolean;
  vessel: boolean;
  satellite: boolean;
  news: boolean;
  seismic: boolean;
  conflict: boolean;
  fire: boolean;
};

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [demoAccess, setDemoAccess] = useState(() => {
    return localStorage.getItem("ophanim_demo_access") === "true";
  });
  const [activeTab, setActiveTab] = useState<"streams" | "news" | "cognition">("streams");
  const [layers, setLayers] = useState<MapLayers>({
    aircraft: true,
    vessel: true,
    satellite: true,
    news: true,
    seismic: true,
    conflict: true,
    fire: true,
  });
  const [events, setEvents] = useState<IntelligenceEvent[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [cognition, setCognition] = useState<CognitionLesson[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<IntelligenceEvent | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoAnalysisActive, setAutoAnalysisActive] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [alerts, setAlerts] = useState<{id: string, msg: string, score: number}[]>([]);
  const [logs, setLogs] = useState<string[]>(["OPHANIM-V1 SYSTEM INITIALIZED"]);
  const [analysisStatus, setAnalysisStatus] = useState<string>("");

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 50));
  };

  const handleCSVImport = (file: File) => {
    setIsImporting(true);
    addLog(`INITIATING_CSV_PARSING: ${file.name}`);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const importedEvents: IntelligenceEvent[] = results.data.map((row: any, i: number) => ({
          id: row.id || `csv-${Date.now()}-${i}`,
          type: (['vessel', 'aircraft', 'conflict', 'news', 'satellite'].includes(row.type) ? row.type : 'news') as any,
          lat: parseFloat(row.lat),
          lng: parseFloat(row.lng),
          label: row.label || "IDENT_UNKNOWN",
          intensity: parseFloat(row.intensity) || 0.5,
          details: row.details || "External data import.",
          timestamp: row.timestamp || new Date().toISOString(),
        })).filter(e => !isNaN(e.lat) && !isNaN(e.lng));

        if (importedEvents.length > 0) {
          setEvents(prev => [...prev, ...importedEvents]);
          addLog(`DATA_IMPORT_SUCCESS: ${importedEvents.length} NODES MERGED.`);
        } else {
          addLog("IMPORT_ERROR: No valid coordinates found in CSV.");
        }
        setIsImporting(false);
      },
      error: (error) => {
        addLog(`IMPORT_FATAL: ${error.message}`);
        setIsImporting(false);
      }
    });
  };

  const fetchIntel = async () => {
    addLog("POLLING ALL DATA STREAMS...");
    try {
      const [newsRes, cogRes, nasaRes, aviaRes, quakeRes, aircraftRes, conflictRes, firmsRes, satRes] = await Promise.all([
        fetch(`${API_BASE}/api/news`).catch(() => null),
        fetch(`${API_BASE}/api/cognition`).catch(() => null),
        fetch(`${API_BASE}/api/nasa`).catch(() => null),
        fetch(`${API_BASE}/api/aviation`).catch(() => null),
        fetch(`${API_BASE}/api/earthquakes`).catch(() => null),
        fetch(`${API_BASE}/api/aircraft`).catch(() => null),
        fetch(`${API_BASE}/api/conflicts`).catch(() => null),
        fetch(`${API_BASE}/api/firms`).catch(() => null),
        fetch(`${API_BASE}/api/satellites`).catch(() => null),
      ]);

      const [newsData, cogData, nasaData, aviaData, quakeData, aircraftData, conflictData, firmsData, satData] = await Promise.all([
        newsRes?.ok ? newsRes.json() : null,
        cogRes?.ok ? cogRes.json() : null,
        nasaRes?.ok ? nasaRes.json() : null,
        aviaRes?.ok ? aviaRes.json() : null,
        quakeRes?.ok ? quakeRes.json() : null,
        aircraftRes?.ok ? aircraftRes.json() : null,
        conflictRes?.ok ? conflictRes.json() : null,
        firmsRes?.ok ? firmsRes.text() : null,
        satRes?.ok ? satRes.json() : null,
      ]);

      if (newsData?.articles) setNews(newsData.articles);
      if (cogData) setCognition(cogData);

      const scrapedEvents: IntelligenceEvent[] = [];

      // NASA EONET environmental events
      if (nasaData?.events) {
        nasaData.events.forEach((e: any) => {
          if (e.geometry?.[0]) {
            scrapedEvents.push({
              id: "nasa-" + e.id,
              type: "news",
              lat: e.geometry[0].coordinates[1],
              lng: e.geometry[0].coordinates[0],
              label: "NASA: " + e.title,
              intensity: 0.5,
              details: "Environmental event: " + (e.description || "Active event monitor."),
              timestamp: e.geometry[0].date
            });
          }
        });
        addLog(`EONET: ${nasaData.events.length} ENVIRONMENTAL NODES SYNCED.`);
      }

      // AviationStack flights (backup if OpenSky empty)
      if (aviaData?.data) {
        aviaData.data.forEach((f: any, i: number) => {
          if (f.live?.latitude) {
            scrapedEvents.push({
              id: "flight-" + i,
              type: "aircraft",
              lat: f.live.latitude,
              lng: f.live.longitude,
              label: f.flight?.iata || "FLIGHT-UNID",
              intensity: 0.2,
              details: `Flight ${f.flight?.number} from ${f.departure?.airport} to ${f.arrival?.airport}. Speed: ${f.live.speed_horizontal}km/h`,
              timestamp: new Date().toISOString()
            });
          }
        });
      }

      // OpenSky real aircraft over MENA
      if (aircraftData?.states) {
        aircraftData.states.slice(0, 30).forEach((s: any, i: number) => {
          if (s[6] && s[5]) {
            scrapedEvents.push({
              id: "opensky-" + i,
              type: "aircraft",
              lat: s[6],
              lng: s[5],
              label: (s[1]?.trim() || "UNID-" + i),
              intensity: 0.3,
              details: `Real aircraft: ${s[1]?.trim() || "Unknown"}. Origin: ${s[2] || "Unknown"}. Alt: ${s[7] ? Math.round(s[7]) + "m" : "Unknown"}. Speed: ${s[9] ? Math.round(s[9]) + "m/s" : "Unknown"}.`,
              timestamp: new Date().toISOString(),
              path: [[s[6], s[5]]]
            });
          }
        });
        addLog(`OPENSKY: ${Math.min(aircraftData.states.length, 30)} REAL AIRCRAFT TRACKED.`);
      }

      // USGS Seismic — detects earthquakes + explosions + missile impacts
      if (quakeData?.features) {
        quakeData.features.forEach((f: any) => {
          const [lng, lat] = f.geometry.coordinates;
          const mag = f.properties.mag;
          const place = f.properties.place;
          const isExplosion = f.properties.type === 'explosion' || f.properties.type === 'quarry blast';
          scrapedEvents.push({
            id: "quake-" + f.id,
            type: "conflict",
            lat,
            lng,
            label: isExplosion ? `⚡ EXPLOSION: ${place}` : `SEISMIC: M${mag} ${place}`,
            intensity: Math.min((mag || 1) / 10, 1.0),
            details: `${isExplosion ? '⚠️ EXPLOSION DETECTED' : 'Seismic event'}: Magnitude ${mag}. Location: ${place}. Depth: ${f.geometry.coordinates[2]}km. ${mag > 4 ? 'ELEVATED THREAT: Could indicate underground detonation or strike.' : ''}`,
            timestamp: new Date(f.properties.time).toISOString()
          });
        });
        addLog(`SEISMIC: ${quakeData.features.length} EVENTS DETECTED.`);
      }

      // GDELT conflict events
      if (conflictData?.features) {
        conflictData.features.slice(0, 20).forEach((f: any, i: number) => {
          if (f.geometry?.coordinates) {
            scrapedEvents.push({
              id: "gdelt-" + i,
              type: "conflict",
              lat: f.geometry.coordinates[1],
              lng: f.geometry.coordinates[0],
              label: "GDELT: " + (f.properties?.name || "CONFLICT EVENT"),
              intensity: 0.7,
              details: f.properties?.htmlurl ? `Conflict event detected. Source: ${f.properties.htmlurl}` : "GDELT conflict node detected.",
              timestamp: new Date().toISOString()
            });
          }
        });
        addLog(`GDELT: ${Math.min(conflictData.features?.length || 0, 20)} CONFLICT NODES SYNCED.`);
      }

      // NASA FIRMS fire data (CSV parse)
      if (firmsData) {
        const lines = firmsData.split('\n').slice(1, 15);
        lines.forEach((line: string, i: number) => {
          const cols = line.split(',');
          if (cols.length > 3) {
            const lat = parseFloat(cols[0]);
            const lng = parseFloat(cols[1]);
            const brightness = parseFloat(cols[2]);
            if (!isNaN(lat) && !isNaN(lng)) {
              scrapedEvents.push({
                id: "firms-" + i,
                type: "news",
                lat,
                lng,
                label: `🔥 FIRE DETECTED`,
                intensity: Math.min(brightness / 400, 1.0),
                details: `NASA FIRMS active fire detection. Brightness: ${brightness}K. Could indicate strike aftermath, industrial fire, or natural wildfire.`,
                timestamp: new Date().toISOString()
              });
            }
          }
        });
        addLog(`FIRMS: FIRE NODES SYNCED.`);
      }

      // N2YO real satellites over MENA
      if (satData?.above && satData.above.length > 0) {
        satData.above.forEach((s: any) => {
          scrapedEvents.push({
            id: "n2yo-" + s.satid,
            type: "satellite",
            lat: s.satlat,
            lng: s.satlng,
            label: s.satname,
            intensity: 0.1,
            details: `Real satellite: ${s.satname}. NORAD ID: ${s.satid}. Altitude: ${Math.round(s.satalt)}km. Launched: ${s.launchDate}.`,
            timestamp: new Date().toISOString(),
            path: [[s.satlat, s.satlng]]
          });
        });
        addLog(`N2YO: ${satData.above.length} REAL SATELLITES TRACKED OVER MENA.`);
      } else {
        // Fallback mocked satellites if N2YO key not set
        const sats = ["STARLINK-1024", "GPS-BIIA-10", "ISS-LOW-ORBIT", "INTELSAT-34"];
        sats.forEach((name, i) => {
          const baseLat = 25.0 + (Math.random() - 0.5) * 15;
          const baseLng = 45.0 + (Math.random() - 0.5) * 15;
          scrapedEvents.push({
            id: "sat-" + i,
            type: "satellite",
            lat: baseLat,
            lng: baseLng,
            label: name,
            intensity: 0.1,
            details: `Orbital Node ${name}. Velocity: 7.6km/s. Signal: Stable.`,
            timestamp: new Date().toISOString(),
            path: [[baseLat - 5, baseLng - 10], [baseLat, baseLng], [baseLat + 5, baseLng + 10]]
          });
        });
      }

      setEvents(prev => {
        // Keep AIS live ships, replace everything else
        const aisShips = prev.filter(e => e.id.startsWith('ais-'));
        return [...aisShips, ...scrapedEvents];
      });
      addLog(`FUSION COMPLETE. ${scrapedEvents.length} TACTICAL NODES SYNCED.`);
    } catch (err) {
      addLog("INTEL FUSION FAILED: CHECK API CONFIG.");
      console.error(err);
    }
  };

  const filteredEvents = events.filter(e => {
    if (e.type === "aircraft") return layers.aircraft;
    if (e.type === "vessel") return layers.vessel;
    if (e.type === "satellite") return layers.satellite;
    if (e.type === "news") return layers.news;
    if (e.type === "conflict") return layers.conflict;
    return true;
  });

  useEffect(() => {
    if (events.length === 0) return;
    const moveInterval = setInterval(() => {
      setEvents(prev => prev.map(event => {
        if (event.type === 'aircraft' || event.type === 'vessel' || event.type === 'satellite') {
          const dLat = (Math.random() - 0.5) * 0.002;
          const dLng = (Math.random() - 0.5) * 0.002;
          const newPath = event.path ? [...event.path.slice(-15), [event.lat, event.lng] as [number, number]] : [[event.lat, event.lng] as [number, number]];
          return { ...event, lat: event.lat + dLat, lng: event.lng + dLng, path: newPath };
        }
        return event;
      }));
    }, 3000);
    return () => clearInterval(moveInterval);
  }, [events.length]);

  const handleAnalyze = async (isManual: boolean = true) => {
    setIsAnalyzing(isManual);
    if (isManual) { setAnalysis(null); setSelectedEvent(null); }
    
    const steps = [
      "INITIALIZING ASI-EVOLVE RESEARCHER AGENT...",
      "QUERYING COGNITION STORE FOR PRIOR LESSONS...",
      "VECTORIZING CURRENT TACTICAL STREAMS...",
      "RUNNING MARITIME/AERIAL CROSS-CORRELATION...",
      "FUSING SEISMIC + CONFLICT + FIRE DATA...",
      "CRYSTALLIZING PREDICTIVE OUTCOME..."
    ];

    if (isManual) {
      for (const step of steps) {
        setAnalysisStatus(step);
        addLog(step);
        await new Promise(r => setTimeout(r, 800));
      }
    } else {
      addLog("ASI-EVOLVE: BACKGROUND RECONNAISSANCE COMMENCED.");
    }
    
    try {
      const response = await fetch(`${API_BASE}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intelligenceData: selectedEvent || events.slice(0, 30) })
      });

      if (response.status === 429) {
        addLog("SIGNAL_INTERRUPT: ANALYSIS THROTTLED.");
        setIsAnalyzing(false);
        setAnalysisStatus("");
        return;
      }

      const result = await response.json();
      setAnalysis({ ...result, timestamp: new Date().toISOString() });

      if (!isManual && result.threat_score > 40) {
        setAlerts(prev => [{ id: Date.now().toString(), msg: result.summary, score: result.threat_score }, ...prev].slice(0, 5));
        addLog(`[ALERT] SUSPICIOUS ACTIVITY DETECTED [${result.threat_score}%]`);
      }

      addLog(isManual ? "ANALYSIS COMPLETE: THREAT MAPPED." : "BACKGROUND SCAN COMPLETE.");
    } catch (err) {
      addLog("AI ANALYSIS ERROR: CONNECTION INTERRUPTED.");
    } finally {
      setIsAnalyzing(false);
      setAnalysisStatus("");
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem("ophanim_demo_access");
    setDemoAccess(false);
    await supabase.auth.signOut();
    addLog("SESSION_TERMINATED: LOGOUT_SUCCESS.");
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session && !demoAccess) return;
    fetchIntel();
    const interval = setInterval(fetchIntel, 60000);

    // AISStream WebSocket — real live ships over MENA
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket('wss://stream.aisstream.io/v0/stream');
      ws.onopen = () => {
        ws!.send(JSON.stringify({
          APIKey: (import.meta as any).env.VITE_AISSTREAM_KEY,
          BoundingBoxes: [[[10, 25], [45, 65]]]
        }));
        addLog("AISSTREAM: LIVE VESSEL FEED CONNECTED.");
      };
      ws.onmessage = (raw) => {
        try {
          const msg = JSON.parse(raw.data);
          const pos = msg.Message?.PositionReport;
          const meta = msg.MetaData;
          if (pos && meta && pos.Latitude && pos.Longitude) {
            const ship: IntelligenceEvent = {
              id: "ais-" + meta.MMSI,
              type: "vessel",
              lat: pos.Latitude,
              lng: pos.Longitude,
              label: meta.ShipName?.trim() || "VESSEL-" + meta.MMSI,
              intensity: 0.4,
              details: `LIVE vessel: ${meta.ShipName?.trim() || "Unknown"}. MMSI: ${meta.MMSI}. Speed: ${pos.SpeedOverGround}kn. Heading: ${pos.TrueHeading}°.`,
              timestamp: new Date().toISOString(),
              path: [[pos.Latitude, pos.Longitude]]
            };
            setEvents(prev => {
              const filtered = prev.filter(e => e.id !== ship.id);
              return [...filtered, ship];
            });
          }
        } catch (e) {}
      };
      ws.onerror = () => addLog("AISSTREAM: CONNECTION ERROR.");
      ws.onclose = () => addLog("AISSTREAM: FEED DISCONNECTED.");
    } catch (e) {
      addLog("AISSTREAM: FAILED TO CONNECT.");
    }

    return () => {
      clearInterval(interval);
      ws?.close();
    };
  }, [session, demoAccess]);

  useEffect(() => {
    if ((!session && !demoAccess) || !autoAnalysisActive) return;
    const interval = setInterval(() => {
      if (!isAnalyzing && events.length > 0) handleAnalyze(false);
    }, 120000);
    return () => clearInterval(interval);
  }, [session, autoAnalysisActive, isAnalyzing, events.length]);

  if (!session && !demoAccess) {
    return <Auth onSuccess={() => { localStorage.setItem("ophanim_demo_access", "true"); setDemoAccess(true); }} />;
  }

  return (
    <div className="flex h-screen w-screen bg-black text-[#00ff41] font-mono select-none overflow-hidden text-sm uppercase">
      <div className="scanline" />
      
      <aside className="w-80 flex flex-col border-r hud-border hud-bg z-10 shrink-0">
        <div className="p-4 border-b hud-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[var(--color-brand-primary)]" />
            <h1 className="font-bold tracking-tighter text-lg leading-none">OPHANIM-V1</h1>
          </div>
          <div className="text-[10px] bg-[var(--color-brand-primary)] text-black px-1 font-bold">LIVE</div>
        </div>

        <div className="flex border-b hud-border text-[10px] h-10">
          <button onClick={() => setActiveTab("streams")} className={cn("flex-1 flex items-center justify-center gap-2 border-r hud-border", activeTab === "streams" && "bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]")}>
            <Activity className="w-3 h-3" /> STREAMS
          </button>
          <button onClick={() => setActiveTab("news")} className={cn("flex-1 flex items-center justify-center gap-2 border-r hud-border", activeTab === "news" && "bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]")}>
            <Newspaper className="w-3 h-3" /> NEWS
          </button>
          <button onClick={() => setActiveTab("cognition")} className={cn("flex-1 flex items-center justify-center gap-2", activeTab === "cognition" && "bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]")}>
            <BrainCircuit className="w-3 h-3" /> COG
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <AnimatePresence mode="wait">
            {activeTab === "streams" && (
              <motion.div key="streams" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-1">
                {/* Layer Toggles */}
                <div className="grid grid-cols-2 gap-1 mb-4">
                  {[
                    { key: 'aircraft', icon: <Plane className="w-3 h-3" />, label: 'AERIAL' },
                    { key: 'vessel', icon: <Ship className="w-3 h-3" />, label: 'MARITIME' },
                    { key: 'satellite', icon: <Orbit className="w-3 h-3" />, label: 'ORBITAL' },
                    { key: 'news', icon: <Globe className="w-3 h-3" />, label: 'EONET' },
                    { key: 'seismic', icon: <Radio className="w-3 h-3" />, label: 'SEISMIC' },
                    { key: 'conflict', icon: <Zap className="w-3 h-3" />, label: 'CONFLICT' },
                    { key: 'fire', icon: <Flame className="w-3 h-3" />, label: 'FIRES' },
                  ].map(({ key, icon, label }) => (
                    <button
                      key={key}
                      onClick={() => setLayers(l => ({ ...l, [key]: !l[key as keyof MapLayers] }))}
                      className={cn("flex items-center gap-2 p-2 border hud-border text-[9px] transition-all", layers[key as keyof MapLayers] ? "bg-[var(--color-brand-primary)] text-black font-bold" : "opacity-40")}
                    >
                      {icon} {label}
                    </button>
                  ))}
                </div>

                <div className="mb-4 flex items-center gap-2">
                  <button onClick={() => fetchIntel()} className="flex-1 flex items-center justify-center gap-2 p-2 border hud-border hud-bg hover:bg-[var(--color-brand-primary)]/20 text-[9px] transition-all">
                    <RefreshCw className={cn("w-3 h-3", isAnalyzing && "animate-spin")} /> REFRESH_FUSION
                  </button>
                  <label className="flex-1 flex items-center justify-center gap-2 p-2 border hud-border hud-bg hover:bg-[var(--color-brand-primary)]/20 text-[9px] transition-all cursor-pointer">
                    <Database className={cn("w-3 h-3", isImporting && "animate-bounce")} /> IMPORT_CSV
                    <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleCSVImport(e.target.files[0])} />
                  </label>
                </div>

                {selectedEvent && (
                  <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="mt-4 p-4 border border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/5 space-y-3">
                    <div className="flex justify-between items-center border-b border-[var(--color-brand-primary)]/30 pb-2">
                      <span className="text-[10px] font-bold text-[var(--color-brand-primary)]">TACTICAL_READOUT</span>
                      <button onClick={() => setSelectedEvent(null)} className="text-[var(--color-brand-primary)] hover:text-white">×</button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[9px]">
                        <span className="opacity-50 uppercase">Target ID</span>
                        <span className="font-bold text-white tracking-widest">{selectedEvent.id.toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between text-[9px]">
                        <span className="opacity-50 uppercase">Coordinates</span>
                        <span className="font-mono">{selectedEvent.lat.toFixed(4)}N, {selectedEvent.lng.toFixed(4)}E</span>
                      </div>
                      <div className="flex justify-between text-[9px]">
                        <span className="opacity-50 uppercase">Classification</span>
                        <span className="text-[var(--color-brand-secondary)]">{selectedEvent.type.toUpperCase()}</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {filteredEvents.length === 0 && (
                  <div className="p-4 border hud-border border-dashed opacity-30 text-center text-[10px]">
                    NO_TARGETS_IN_VIEW // STREAMS_SILENT
                  </div>
                )}

                {filteredEvents.map((event) => (
                  <button key={event.id} onClick={() => setSelectedEvent(event)}
                    className={cn("w-full text-left p-2 border hud-border flex items-center justify-between hover:bg-[var(--color-brand-primary)] hover:text-black transition-colors group", selectedEvent?.id === event.id && "bg-[var(--color-brand-primary)] text-black")}
                  >
                    <div className="truncate pr-2">
                      <div className="text-[10px] font-bold">{event.type.toUpperCase()}</div>
                      <div className="truncate">{event.label}</div>
                    </div>
                    <Crosshair className={cn("w-4 h-4 shrink-0 opacity-40 group-hover:opacity-100", event.intensity > 0.7 && "animate-pulse text-red-500")} />
                  </button>
                ))}
              </motion.div>
            )}

            {activeTab === "news" && (
              <motion.div key="news" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-2">
                {news.length === 0 ? <div className="text-center opacity-40 mt-10">NO NEWS FEEDS ACTIVE</div> : news.map((item, i) => (
                  <a key={i} href={item.url} target="_blank" rel="noreferrer" className="p-2 border hud-border hud-bg hover:border-[var(--color-brand-primary)] transition-colors block">
                    <div className="text-[9px] text-[var(--color-brand-primary)] mb-1 opacity-60 italic">{item.source.name} • {new Date(item.publishedAt).toLocaleDateString()}</div>
                    <div className="text-[11px] font-bold leading-tight line-clamp-2">{item.title}</div>
                  </a>
                ))}
              </motion.div>
            )}

            {activeTab === "cognition" && (
              <motion.div key="cognition" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
                <div className="text-[10px] opacity-40 mb-2">ASI-EVOLVE KNOWLEDGE BASE</div>
                {cognition.length === 0 && <div className="text-center opacity-40 mt-10 text-[10px]">NO COGNITION NODES YET</div>}
                {cognition.map((lesson) => (
                  <div key={lesson.id} className="p-3 border hud-border hud-bg relative group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[var(--color-brand-primary)] scale-y-0 group-hover:scale-y-100 transition-transform origin-top" />
                    <div className="text-[10px] font-bold text-[var(--color-brand-primary)] mb-1">{lesson.title}</div>
                    <div className="text-[10px] leading-relaxed opacity-80">{lesson.lesson}</div>
                    <div className="mt-2 text-[8px] opacity-40 tracking-widest">{lesson.context?.toUpperCase()}</div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <section className="mt-auto pt-4 flex flex-col min-h-[150px]">
            <div className="flex items-center gap-2 mb-2 text-xs opacity-60">
              <Terminal className="w-3 h-3" />
              <span>SYSTEM LOGS</span>
            </div>
            <div className="flex-1 bg-black/50 border hud-border p-2 overflow-y-auto text-[10px] leading-relaxed flex flex-col-reverse max-h-40">
              {logs.map((log, i) => (
                <div key={i} className="mb-px border-l-2 border-[var(--color-brand-primary)]/20 pl-2">
                  <span className="opacity-40">[{new Date().toLocaleTimeString()}]</span> {log}
                </div>
              ))}
            </div>
          </section>
        </div>
        
        <div className="p-4 border-t hud-border flex items-center justify-between text-[10px]">
          <button onClick={handleLogout} className="text-red-500/60 hover:text-red-500 hover:bg-red-500/10 px-1 border border-red-500/20 transition-all uppercase tracking-tighter">
            DISCONNECT
          </button>
          <button onClick={fetchIntel} className="hover:text-[var(--color-brand-primary)] flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> SYNC
          </button>
        </div>
      </aside>

      {/* Notifications */}
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 w-80 pointer-events-none">
        <AnimatePresence>
          {alerts.map(alert => (
            <motion.div key={alert.id} initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 100, opacity: 0 }}
              className="hud-bg border-2 border-red-500 p-4 pointer-events-auto cursor-pointer"
              onClick={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-red-500 tracking-widest animate-pulse flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> HIGH_THREAT_DETECTED
                </span>
                <span className="text-xl font-black text-red-500">{alert.score}%</span>
              </div>
              <p className="text-[10px] leading-tight opacity-90">{alert.msg}</p>
              <div className="mt-2 text-[8px] opacity-40 uppercase">Click to dismiss</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <main className="flex-1 relative flex flex-col shrink min-w-0">
        <div className="flex-1 min-h-0">
          <IntelMap events={filteredEvents} selectedEvent={selectedEvent} onEventClick={setSelectedEvent} />
        </div>
        
        <div className="h-12 border-t hud-border hud-bg flex items-center px-4 justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => handleAnalyze(true)} disabled={isAnalyzing}
              className="flex items-center gap-2 bg-[var(--color-brand-primary)] text-black px-4 py-1 font-bold hover:bg-white hover:text-black transition-colors disabled:opacity-50"
            >
              {isAnalyzing ? <Cpu className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
              {isAnalyzing ? "PROCESSING EVOLUTION..." : "IN-DEPTH ASI-EVOLVE REVIEW"}
            </button>
            <div className="text-[9px] flex items-center gap-2 opacity-60">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand-primary)] animate-pulse" />
              SUPABASE_LINK: ESTABLISHED
            </div>
            <button onClick={() => setAutoAnalysisActive(!autoAnalysisActive)}
              className={cn("text-[10px] px-2 py-1 border transition-colors", autoAnalysisActive ? "border-[var(--color-brand-primary)] text-[var(--color-brand-primary)]" : "border-gray-600 text-gray-600")}
            >
              AUTO-MONITOR: {autoAnalysisActive ? "ON" : "OFF"}
            </button>
            <div className="text-[10px] flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-yellow-500" />
              THREAT MODE: CAUTION
            </div>
          </div>
          <div className="flex items-center gap-4 text-[10px] opacity-60">
            <span>CORE: DEEPSEEK-V3</span>
            <span className="flex items-center gap-1"><Database className="w-3 h-3" /> {cognition.length} NODES</span>
            <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {filteredEvents.length} TARGETS</span>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {(selectedEvent || analysis) && (
          <motion.aside initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }}
            className="w-96 border-l hud-border hud-bg flex flex-col shrink-0 z-10 shadow-2xl"
          >
            <div className="p-4 border-b hud-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                <h2 className="font-bold tracking-tight">TARGET RECONNAISSANCE</h2>
              </div>
              <button onClick={() => { setSelectedEvent(null); setAnalysis(null); }} className="hover:text-white p-1">&times;</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {selectedEvent && (
                <section>
                  <div className="text-[10px] opacity-60 mb-1">IDENTIFIER: {selectedEvent.id}</div>
                  <div className="text-xl font-bold tracking-tight mb-2 border-b-2 border-[var(--color-brand-primary)] pb-1">{selectedEvent.label}</div>
                  <div className="grid grid-cols-2 gap-4 text-[10px] mb-4">
                    <div className="hud-bg border hud-border p-2"><div className="opacity-50">LATITUDE</div><div className="font-bold">{selectedEvent.lat.toFixed(4)}</div></div>
                    <div className="hud-bg border hud-border p-2"><div className="opacity-50">LONGITUDE</div><div className="font-bold">{selectedEvent.lng.toFixed(4)}</div></div>
                  </div>
                  <div className="hud-bg border hud-border p-3 text-xs leading-relaxed border-l-4 border-[var(--color-brand-primary)]">{selectedEvent.details}</div>
                </section>
              )}

              {analysis && (
                <motion.section initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                  <div className="flex items-center gap-2 text-xs border-t hud-border pt-4">
                    <Cpu className="w-4 h-4" /><span>ASI-EVOLVE INFERENCE ENGINE</span>
                  </div>
                  <div className="hud-bg border-2 border-[var(--color-brand-primary)]/40 p-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-[var(--color-brand-primary)]" />
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold">THREAT PROBABILITY</span>
                      <span className={cn("text-2xl font-black", (analysis?.threat_score || 0) > 70 ? "text-red-500" : "text-[var(--color-brand-primary)]")}>
                        {analysis?.threat_score || 0}%
                      </span>
                    </div>
                    <div className="w-full bg-black/50 h-1.5 mb-4">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${analysis?.threat_score || 0}%` }}
                        className={cn("h-full", (analysis?.threat_score || 0) > 70 ? "bg-red-500" : "bg-[var(--color-brand-primary)]")}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[10px] opacity-60 uppercase font-black">Evidence Trail:</div>
                    {Array.isArray(analysis?.evidence) ? analysis.evidence.map((ev, i) => (
                      <div key={i} className="text-[11px] hud-bg border hud-border p-2 flex items-start gap-2 border-l-2 hover:border-l-[var(--color-brand-primary)] transition-all">
                        <span className="text-[var(--color-brand-primary)] mt-1">•</span><span>{ev}</span>
                      </div>
                    )) : <div className="text-[10px] opacity-40 italic">No evidence detected.</div>}
                  </div>

                  <div className="bg-[var(--color-brand-primary)] text-black p-4">
                    <div className="text-[10px] font-black mb-1 underline tracking-widest">TACTICAL_RECOMMENDATION:</div>
                    <p className="text-xs font-bold leading-tight uppercase italic">{analysis?.recommendation || "CONTINUE MONITORING STREAMS"}</p>
                  </div>

                  <div className="text-[10px] opacity-50 italic">{analysis?.summary || "Analysis complete."}</div>
                </motion.section>
              )}

              {isAnalyzing && (
                <div className="flex flex-col items-center justify-center p-12 text-center space-y-6">
                  <div className="relative">
                    <Cpu className="w-16 h-16 animate-pulse text-[var(--color-brand-primary)]" />
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 border-4 border-dashed border-[var(--color-brand-primary)]/20 rounded-full scale-150"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="text-[10px] tracking-[0.2em] font-black animate-pulse text-[var(--color-brand-primary)]">ASI-EVOLVE ACTIVE</div>
                    <div className="text-[9px] bg-white/5 border border-white/10 p-2 leading-tight">{analysisStatus}</div>
                    <div className="text-[8px] opacity-40">INGESTING TACTICAL NODES...</div>
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}


