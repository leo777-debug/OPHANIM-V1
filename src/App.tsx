import Auth from "./components/Auth";
import TimeMachine from "./components/TimeMachine";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, AlertTriangle, Layers, Shield, Cpu, Terminal,
  Crosshair, Globe, Newspaper, Database, BrainCircuit,
  RefreshCw, Search, Plane, Ship, Orbit, Zap, Flame, Radio, Wifi,
  ChevronDown, X, Bell, Settings, LogOut, Filter, Clock,
  BarChart2, Map, Eye, EyeOff, ChevronRight, Info
} from "lucide-react";
import IntelMap from "./components/IntelMap";
import { IntelligenceEvent, AnalysisResult, CognitionLesson, NewsItem } from "./types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Papa from "papaparse";
import { supabase } from "./lib/supabase";

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

const API_BASE = (import.meta as any).env.VITE_API_URL || "";

export type MapLayers = {
  aircraft: boolean; vessel: boolean; satellite: boolean;
  news: boolean; seismic: boolean; conflict: boolean; fire: boolean;
  jamming: boolean;
};

type Region = {
  id: string; label: string;
  center: [number, number]; zoom: number;
  bbox: number[];
};

const REGIONS: Region[] = [
  { id: "global", label: "Global", center: [20, 0], zoom: 2, bbox: [-180,-90,180,90] },
  { id: "mena", label: "MENA", center: [26, 45], zoom: 5, bbox: [25,10,65,45] },
  { id: "europe", label: "Europe", center: [50, 15], zoom: 4, bbox: [-10,35,40,70] },
  { id: "americas", label: "Americas", center: [15,-80], zoom: 3, bbox: [-130,-55,-35,55] },
  { id: "asia", label: "Asia", center: [30, 100], zoom: 3, bbox: [60,-10,150,55] },
  { id: "africa", label: "Africa", center: [0, 20], zoom: 3, bbox: [-20,-35,55,38] },
  { id: "oceania", label: "Oceania", center: [-25, 135], zoom: 3, bbox: [110,-50,180,0] },
  { id: "arctic", label: "Arctic", center: [80, 0], zoom: 3, bbox: [-180,60,180,90] },
];

const LAYER_CONFIG = [
  { key: "aircraft", icon: Plane, label: "Aviation", color: "#60A5FA" },
  { key: "vessel", icon: Ship, label: "Maritime", color: "#34D399" },
  { key: "satellite", icon: Orbit, label: "Satellites",color: "#A78BFA" },
  { key: "conflict", icon: Zap, label: "Conflict", color: "#F87171" },
  { key: "seismic", icon: Radio, label: "Seismic", color: "#FBBF24" },
  { key: "fire", icon: Flame, label: "Fires", color: "#FB923C" },
  { key: "jamming", icon: Wifi, label: "EW / Jam", color: "#E879F9" },
  { key: "news", icon: Globe, label: "EONET", color: "#2DD4BF" },
];

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [demoAccess, setDemoAccess] = useState(() => localStorage.getItem("ophanim_demo_access") === "true");
  const [activeTab, setActiveTab] = useState<"layers" | "events" | "news" | "intel">("layers");
  const [region, setRegion] = useState<Region>(REGIONS[0]);
  const [showRegionMenu, setShowRegionMenu] = useState(false);
  const [layers, setLayers] = useState<MapLayers>({
    aircraft: true, vessel: true, satellite: true, news: true,
    seismic: true, conflict: true, fire: true, jamming: true,
  });
  const [events, setEvents] = useState<IntelligenceEvent[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [cognition, setCognition] = useState<CognitionLesson[]>([
    { id: "seed-1", title: "Strait of Hormuz Chokepoint", lesson: "Vessel clustering near Qeshm Island with AIS dark periods >2h = high-priority target. IRGCN doctrine relies on swarm tactics from these staging points.", context: "ATLAS — Persian Gulf Operations" },
    { id: "seed-2", title: "GPS Spoofing Signature — MENA", lesson: "Spoofing in eastern Med/Persian Gulf typically precedes kinetic action by 24-72h. Vessels reporting impossible positions indicate active EW operations.", context: "ATLAS Electronic Warfare" },
    { id: "seed-3", title: "Houthi Missile Seismic Signature", lesson: "Ballistic launches from Yemen generate shallow seismic events (<2km depth, M1.5-2.5). Cross-reference ADS-B gaps and news for confirmation.", context: "ATLAS Yemen Operations" },
    { id: "seed-4", title: "Red Sea Threat Assessment", lesson: "Vessels transiting Bab el-Mandeb: avoid night transit at ORANGE+. Houthi attacks peak 2200-0200 local time historically.", context: "ATLAS Maritime Security" },
    { id: "seed-5", title: "IAF Operations Signature", lesson: "IAF strikes preceded by increased UAV activity over Lebanon/Syria + GPS jamming expanding from northern Israel.", context: "ATLAS OSINT — Levant" },
  ]);
  const [selectedEvent, setSelectedEvent] = useState<IntelligenceEvent | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoAnalysisActive, setAutoAnalysisActive] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [alerts, setAlerts] = useState<{ id: string; msg: string; score: number }[]>([]);
  const [logs, setLogs] = useState<string[]>(["OPHANIM SYSTEM INITIALISED"]);
  const [analysisStatus, setAnalysisStatus] = useState<string>("");
  const [isLive, setIsLive] = useState(true);
  const [historicalEvents, setHistoricalEvents] = useState<IntelligenceEvent[] | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const liveAircraftRef = useRef<Map<string, IntelligenceEvent>>(new Map());
  const liveShipsRef = useRef<Map<string, IntelligenceEvent>>(new Map());

  const addLog = (msg: string) => setLogs(prev => [msg, ...prev].slice(0, 100));

  const playAlarm = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playBeep = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq; osc.type = "square";
        gain.gain.setValueAtTime(0.3, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.start(ctx.currentTime + start); osc.stop(ctx.currentTime + start + duration);
      };
      playBeep(880, 0, 0.1); playBeep(660, 0.15, 0.1);
      playBeep(880, 0.3, 0.1); playBeep(440, 0.45, 0.3);
    } catch (e) {}
  };

  const handleCSVImport = (file: File) => {
    setIsImporting(true);
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (results) => {
        const imported: IntelligenceEvent[] = (results.data as any[]).map((row, i) => ({
          id: row.id || `csv-${Date.now()}-${i}`,
          type: (["vessel","aircraft","conflict","news","satellite"].includes(row.type) ? row.type : "news") as any,
          lat: parseFloat(row.lat), lng: parseFloat(row.lng),
          label: row.label || "UNKNOWN", intensity: parseFloat(row.intensity) || 0.5,
          details: row.details || "Imported.", timestamp: row.timestamp || new Date().toISOString(),
        })).filter(e => !isNaN(e.lat) && !isNaN(e.lng));
        if (imported.length > 0) { setEvents(prev => [...prev, ...imported]); addLog(`CSV: ${imported.length} events imported.`); }
        setIsImporting(false);
      },
      error: (err) => { addLog(`CSV error: ${err.message}`); setIsImporting(false); }
    });
  };

  const saveEventsToHistory = async (eventsToSave: IntelligenceEvent[]) => {
    if (eventsToSave.length === 0) return;
    const rows = eventsToSave.filter(e => e.lat && e.lng).slice(0, 100).map(e => ({
      asset_id: e.id, asset_type: e.type, lat: e.lat, lng: e.lng,
      label: e.label, intensity: e.intensity, details: e.details,
      recorded_at: new Date().toISOString(),
    }));
    try {
      const { error } = await supabase.from("event_history").insert(rows);
      if (error) console.error("Supabase insert error:", error);
    } catch (err) { console.warn("History save failed:", err); }
  };

  const mergeLiveData = () => {
    setEvents(prev => {
      const staticEvents = prev.filter(e => !e.id.startsWith("adsb-") && !e.id.startsWith("ais-"));
      return [...staticEvents, ...Array.from(liveAircraftRef.current.values()), ...Array.from(liveShipsRef.current.values())];
    });
  };

  const fetchAircraft = async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/aircraft`);
      if (!resp.ok) return;
      const data = await resp.json();
      if (data.ac?.length > 0) {
        let mil = 0;
        data.ac.filter((a: any) => a.lat && a.lon).forEach((a: any) => {
          const isMil = a.t?.includes("MIL") ||
            ["RCH","DUKE","FORTE","LAGR","HOMER","USAF","UAF","JAKE","ROCKY","KING","REACH","TOPGN"].some(p => a.flight?.startsWith(p)) ||
            ["7700","7600","7500"].includes(a.squawk);
          if (isMil) mil++;
          const ev: IntelligenceEvent = {
            id: "adsb-" + a.hex, type: "aircraft", lat: a.lat, lng: a.lon,
            label: isMil ? `MIL: ${a.flight?.trim() || a.hex}` : (a.flight?.trim() || a.hex || "UNID"),
            intensity: isMil ? 0.9 : 0.3,
            details: `${isMil ? "MILITARY" : "Civil"}: ${a.flight?.trim() || "Unknown"} | Alt: ${a.alt_baro || "?"}ft | Speed: ${a.gs || "?"}kts | Squawk: ${a.squawk || "None"}`,
            timestamp: new Date().toISOString(),
            path: (liveAircraftRef.current.get("adsb-" + a.hex)?.path || []).slice(-20).concat([[a.lat, a.lon]]) as [number, number][],
          };
          liveAircraftRef.current.set(ev.id, ev);
        });
        mergeLiveData();
        addLog(`ADS-B: ${data.ac.filter((a: any) => a.lat).length} aircraft tracked (${mil} military)`);
      }
    } catch (e) { addLog("ADS-B: Fetch failed"); }
  };

  const fetchIntel = async () => {
    addLog("Polling all intelligence streams...");
    try {
      const [newsRes, cogRes, nasaRes, quakeRes, conflictRes, firmsRes, satRes, jammingRes, blackoutRes] = await Promise.all([
        fetch(`${API_BASE}/api/news`).catch(() => null),
        fetch(`${API_BASE}/api/cognition`).catch(() => null),
        fetch(`${API_BASE}/api/nasa`).catch(() => null),
        fetch(`${API_BASE}/api/earthquakes`).catch(() => null),
        fetch(`${API_BASE}/api/conflicts`).catch(() => null),
        fetch(`${API_BASE}/api/firms`).catch(() => null),
        fetch(`${API_BASE}/api/satellites`).catch(() => null),
        fetch(`${API_BASE}/api/jamming`).catch(() => null),
        fetch(`${API_BASE}/api/blackouts`).catch(() => null),
      ]);

      const [newsData, cogData, nasaData, quakeData, conflictData, firmsData, satData, jammingData, blackoutData] = await Promise.all([
        newsRes?.ok ? newsRes.json() : null,
        cogRes?.ok ? cogRes.json() : null,
        nasaRes?.ok ? nasaRes.json() : null,
        quakeRes?.ok ? quakeRes.json() : null,
        conflictRes?.ok ? conflictRes.json() : null,
        firmsRes?.ok ? firmsRes.text() : null,
        satRes?.ok ? satRes.json() : null,
        jammingRes?.ok ? jammingRes.json() : null,
        blackoutRes?.ok ? blackoutRes.json() : null,
      ]);

      if (newsData?.articles) setNews(newsData.articles);
      if (cogData?.length > 0) setCognition(cogData);

      const scraped: IntelligenceEvent[] = [];

      nasaData?.events?.forEach((e: any) => {
        if (e.geometry?.[0]) scraped.push({
          id: "nasa-" + e.id, type: "news",
          lat: e.geometry[0].coordinates[1], lng: e.geometry[0].coordinates[0],
          label: "EONET: " + e.title, intensity: 0.5,
          details: `NASA EONET: ${e.title} | Category: ${e.categories?.[0]?.title || "Unknown"}`,
          timestamp: e.geometry[0].date,
        });
      });

      quakeData?.features?.forEach((f: any) => {
        const [lng, lat] = f.geometry.coordinates;
        const mag = f.properties.mag, place = f.properties.place, type = f.properties.type;
        const isExp = type === "explosion" || type === "quarry blast";
        const isMissile = mag > 3.0 && type === "earthquake" && f.geometry.coordinates[2] < 5;
        scraped.push({
          id: "quake-" + f.id, type: "conflict", lat, lng,
          label: isExp ? `EXPLOSION M${mag} — ${place}` : isMissile ? `SHALLOW SEISMIC M${mag} — ${place}` : `SEISMIC M${mag} — ${place}`,
          intensity: Math.min(Math.abs(mag || 0.1) / 8, 1.0),
          details: `${isExp ? "EXPLOSION DETECTED" : isMissile ? "POSSIBLE STRIKE" : "Seismic"}: M${mag} | ${place} | Depth: ${f.geometry.coordinates[2]}km | ${type}`,
          timestamp: new Date(f.properties.time).toISOString(),
        });
      });

      conflictData?.features?.slice(0, 30).forEach((f: any, i: number) => {
        if (f.geometry?.coordinates) scraped.push({
          id: "gdelt-" + i, type: "conflict",
          lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0],
          label: "GDELT: " + (f.properties?.name || "Conflict Event"),
          intensity: 0.7,
          details: `GDELT event | ${f.properties?.htmlurl ? "Source: " + f.properties.htmlurl : "Real-time tracking"}`,
          timestamp: new Date().toISOString(),
        });
      });

      if (firmsData) {
        firmsData.split("\n").slice(1, 30).forEach((line: string, i: number) => {
          const cols = line.split(",");
          if (cols.length > 3) {
            const lat = parseFloat(cols[0]), lng = parseFloat(cols[1]), brightness = parseFloat(cols[2]);
            if (!isNaN(lat) && !isNaN(lng)) scraped.push({
              id: "firms-" + i, type: "news", lat, lng,
              label: `FIRE — Brightness ${brightness}K`,
              intensity: Math.min(brightness / 400, 1.0),
              details: `NASA FIRMS active fire | Brightness: ${brightness}K | VIIRS satellite`,
              timestamp: new Date().toISOString(),
            });
          }
        });
      }

      satData?.above?.forEach((s: any) => {
        scraped.push({
          id: "n2yo-" + s.satid, type: "satellite", lat: s.satlat, lng: s.satlng,
          label: s.satname, intensity: 0.1,
          details: `${s.satname} | NORAD: ${s.satid} | Alt: ${Math.round(s.satalt)}km | ~7.6km/s`,
          timestamp: new Date().toISOString(),
          path: [[s.satlat, s.satlng]],
        });
      });

      jammingData?.jams?.forEach((j: any, i: number) => {
        if (j.lat && j.lon) scraped.push({
          id: "jam-" + i, type: "conflict", lat: j.lat, lng: j.lon,
          label: `GPS JAM — ${j.location || "Unknown"}`,
          intensity: 0.8,
          details: `GPS jamming detected | ${j.location || "Unknown"} | Level: ${j.level || "High"}`,
          timestamp: new Date().toISOString(),
        });
      });

      blackoutData?.data?.slice(0, 10).forEach((b: any, i: number) => {
        if (b.location?.latitude && b.location?.longitude) scraped.push({
          id: "blackout-" + i, type: "conflict",
          lat: b.location.latitude, lng: b.location.longitude,
          label: `BLACKOUT — ${b.entity?.name || "Unknown"}`,
          intensity: 0.6,
          details: `Internet outage | ${b.entity?.name} | ${b.location?.country}`,
          timestamp: new Date().toISOString(),
        });
      });

      setEvents(prev => [...scraped, ...Array.from(liveAircraftRef.current.values()), ...Array.from(liveShipsRef.current.values())]);
      addLog(`Fusion complete — ${scraped.length} events synced`);
      saveEventsToHistory(scraped);
    } catch (err) {
      addLog("Intelligence fusion failed — check API configuration");
      console.error(err);
    }
  };

  const filteredEvents = events.filter(e => {
    if (e.type === "aircraft") return layers.aircraft;
    if (e.type === "vessel") return layers.vessel;
    if (e.type === "satellite") return layers.satellite;
    if (e.type === "news") return layers.news;
    if (e.type === "conflict") {
      if (e.id.startsWith("quake-")) return layers.seismic;
      if (e.id.startsWith("jam-") || e.id.startsWith("blackout-")) return layers.jamming;
      return layers.conflict;
    }
    return true;
  });

  useEffect(() => {
    if (events.length === 0) return;
    const id = setInterval(() => {
      setEvents(prev => prev.map(ev => {
        if (ev.type === "satellite") {
          const dLat = (Math.random() - 0.5) * 0.05, dLng = (Math.random() - 0.3) * 0.1;
          return { ...ev, lat: ev.lat + dLat, lng: ev.lng + dLng, path: [...(ev.path || []).slice(-20), [ev.lat, ev.lng]] as [number, number][] };
        }
        return ev;
      }));
    }, 2000);
    return () => clearInterval(id);
  }, [events.length]);

  const handleAnalyze = async (isManual = true) => {
    setIsAnalyzing(isManual);
    if (isManual) { setAnalysis(null); setSelectedEvent(null); }
    const steps = ["Initialising analysis engine...", "Fetching GIBS satellite imagery...", "Querying knowledge base...", "Fusing multi-domain streams...", "Generating predictive assessment..."];
    if (isManual) for (const step of steps) { setAnalysisStatus(step); addLog(step); await new Promise(r => setTimeout(r, 700)); }
    try {
      const resp = await fetch(`${API_BASE}/api/analyze`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intelligenceData: selectedEvent || events.slice(0, 30) }),
      });
      if (resp.status === 429) { addLog("Rate limited — please wait"); setIsAnalyzing(false); setAnalysisStatus(""); return; }
      const result = await resp.json();
      setAnalysis({ ...result, timestamp: new Date().toISOString() });
      if (!isManual && result.threat_score > 40) {
        setAlerts(prev => [{ id: Date.now().toString(), msg: result.summary, score: result.threat_score }, ...prev].slice(0, 5));
        addLog(`ALERT: Threat score ${result.threat_score}%`);
        playAlarm();
      }
      addLog(isManual ? "Analysis complete" : "Background scan complete");
    } catch (err) { addLog("Analysis error"); }
    finally { setIsAnalyzing(false); setAnalysisStatus(""); }
  };

  const handleLogout = async () => {
    localStorage.removeItem("ophanim_demo_access");
    setDemoAccess(false);
    await supabase.auth.signOut();
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session && !demoAccess) return;
    fetchIntel(); fetchAircraft();
    const i1 = setInterval(fetchIntel, 60000);
    const i2 = setInterval(fetchAircraft, 15000);
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket("wss://stream.aisstream.io/v0/stream");
      ws.onopen = () => {
        ws!.send(JSON.stringify({ APIKey: (import.meta as any).env.VITE_AISSTREAM_KEY, BoundingBoxes: [[[-90, -180], [90, 180]]] }));
        addLog("AIS stream connected — global coverage");
      };
      ws.onmessage = (raw) => {
        try {
          const msg = JSON.parse(raw.data);
          const pos = msg.Message?.PositionReport, meta = msg.MetaData;
          if (pos && meta && pos.Latitude && pos.Longitude) {
            const prev = liveShipsRef.current.get("ais-" + meta.MMSI);
            const ship: IntelligenceEvent = {
              id: "ais-" + meta.MMSI, type: "vessel", lat: pos.Latitude, lng: pos.Longitude,
              label: meta.ShipName?.trim() || "VESSEL-" + meta.MMSI, intensity: 0.4,
              details: `${meta.ShipName?.trim() || "Unknown"} | MMSI: ${meta.MMSI} | Speed: ${pos.SpeedOverGround}kn | Heading: ${pos.TrueHeading}°`,
              timestamp: new Date().toISOString(),
              path: [...(prev?.path || []).slice(-20), [pos.Latitude, pos.Longitude]] as [number, number][],
            };
            liveShipsRef.current.set(ship.id, ship);
            mergeLiveData();
          }
        } catch (e) {}
      };
      ws.onerror = () => addLog("AIS stream error");
      ws.onclose = () => addLog("AIS stream disconnected");
    } catch (e) { addLog("AIS stream failed to connect"); }
    return () => { clearInterval(i1); clearInterval(i2); ws?.close(); };
  }, [session, demoAccess]);

  useEffect(() => {
    if ((!session && !demoAccess) || !autoAnalysisActive) return;
    const id = setInterval(() => { if (!isAnalyzing && events.length > 0) handleAnalyze(false); }, 120000);
    return () => clearInterval(id);
  }, [session, autoAnalysisActive, isAnalyzing, events.length]);

  if (!session && !demoAccess) {
    return <Auth onSuccess={() => { localStorage.setItem("ophanim_demo_access", "true"); setDemoAccess(true); }} />;
  }

  const threatColor = (score: number) => score > 70 ? "#EF4444" : score > 40 ? "#F59E0B" : "#22C55E";

  return (
    <div style={{ fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif" }}
      className="flex flex-col h-screen w-screen bg-[#0B0E14] text-[#E2E8F0] overflow-hidden">
      {/* ── TOP NAV BAR ── */}
      <header className="flex items-center justify-between px-4 h-11 bg-[#0D1117] border-b border-[#1E2736] shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#3B82F6] rounded flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-white tracking-wide">OPHANIM</span>
            <span className="text-[10px] text-[#3B82F6] font-medium px-1.5 py-0.5 bg-[#3B82F6]/10 rounded">v1</span>
          </div>
          <div className="w-px h-4 bg-[#1E2736]" />
          {/* Region selector */}
          <div className="relative">
            <button onClick={() => setShowRegionMenu(!showRegionMenu)}
              className="flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-white transition-colors px-2 py-1 rounded hover:bg-[#1E2736]">
              <Globe className="w-3.5 h-3.5" />
              <span>{region.label}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {showRegionMenu && (
              <div className="absolute top-full left-0 mt-1 bg-[#0D1117] border border-[#1E2736] rounded-lg shadow-2xl z-50 py-1 min-w-36">
                {REGIONS.map(r => (
                  <button key={r.id} onClick={() => { setRegion(r); setShowRegionMenu(false); }}
                    className={cn("w-full text-left px-3 py-1.5 text-xs hover:bg-[#1E2736] transition-colors",
                      region.id === r.id ? "text-[#3B82F6]" : "text-[#94A3B8]")}>
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#22C55E]/10">
            <div className={cn("w-1.5 h-1.5 rounded-full", isLive ? "bg-[#22C55E] animate-pulse" : "bg-[#F59E0B]")} />
            <span className="text-[10px] font-medium" style={{ color: isLive ? "#22C55E" : "#F59E0B" }}>
              {isLive ? "LIVE" : "HISTORICAL"}
            </span>
          </div>
          <div className="w-px h-4 bg-[#1E2736] mx-1" />
          <span className="text-[10px] text-[#475569] mr-2">{filteredEvents.length} events</span>
          <button onClick={() => setShowAlerts(!showAlerts)} className="relative p-1.5 rounded hover:bg-[#1E2736] transition-colors">
            <Bell className="w-4 h-4 text-[#64748B]" />
            {alerts.length > 0 && <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full" />}
          </button>
          <button onClick={() => setAutoAnalysisActive(!autoAnalysisActive)}
            className={cn("p-1.5 rounded transition-colors", autoAnalysisActive ? "bg-[#3B82F6]/10 text-[#3B82F6]" : "hover:bg-[#1E2736] text-[#64748B]")}>
            <Activity className="w-4 h-4" />
          </button>
          <button onClick={handleLogout} className="p-1.5 rounded hover:bg-[#1E2736] transition-colors text-[#64748B] hover:text-red-400">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>
      <div className="flex flex-1 min-h-0">
        {/* ── LEFT SIDEBAR ── */}
        <aside className="w-64 bg-[#0D1117] border-r border-[#1E2736] flex flex-col shrink-0 z-10">
          {/* Tab bar */}
          <div className="flex border-b border-[#1E2736]">
            {[
              { id: "layers", icon: Layers, label: "Layers" },
              { id: "events", icon: Crosshair, label: "Events" },
              { id: "news", icon: Newspaper, label: "News" },
              { id: "intel", icon: BrainCircuit, label: "Intel" },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                className={cn("flex-1 flex flex-col items-center gap-0.5 py-2 text-[9px] font-medium transition-colors border-b-2",
                  activeTab === tab.id ? "border-[#3B82F6] text-[#3B82F6] bg-[#3B82F6]/5" : "border-transparent text-[#475569] hover:text-[#94A3B8]")}>
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {/* LAYERS TAB */}
            {activeTab === "layers" && (
              <div className="p-3 space-y-1">
                <div className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider px-1 py-2">Data Layers</div>
                {LAYER_CONFIG.map(({ key, icon: Icon, label, color }) => (
                  <button key={key}
                    onClick={() => setLayers(l => ({ ...l, [key]: !l[key as keyof MapLayers] }))}
                    className={cn("w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs transition-all",
                      layers[key as keyof MapLayers] ? "bg-[#1E2736] text-white" : "text-[#475569] hover:bg-[#1E2736]/50")}>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: layers[key as keyof MapLayers] ? color : "#334155" }} />
                    <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: layers[key as keyof MapLayers] ? color : "#475569" }} />
                    <span>{label}</span>
                    <div className="ml-auto">
                      {layers[key as keyof MapLayers]
                        ? <Eye className="w-3 h-3 text-[#475569]" />
                        : <EyeOff className="w-3 h-3 text-[#334155]" />}
                    </div>
                  </button>
                ))}
                <div className="border-t border-[#1E2736] my-3" />
                <div className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider px-1 py-1">Actions</div>
                <button onClick={() => { fetchIntel(); fetchAircraft(); }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs text-[#94A3B8] hover:bg-[#1E2736] hover:text-white transition-all">
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh all streams
                </button>
                <label className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs text-[#94A3B8] hover:bg-[#1E2736] hover:text-white transition-all cursor-pointer">
                  <Database className={cn("w-3.5 h-3.5", isImporting && "animate-bounce")} />
                  {isImporting ? "Importing..." : "Import CSV data"}
                  <input type="file" accept=".csv" className="hidden"
                    onChange={e => e.target.files?.[0] && handleCSVImport(e.target.files[0])} />
                </label>
                <button onClick={() => handleAnalyze(true)} disabled={isAnalyzing}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-medium bg-[#3B82F6]/10 text-[#3B82F6] hover:bg-[#3B82F6]/20 transition-all disabled:opacity-50">
                  <Cpu className={cn("w-3.5 h-3.5", isAnalyzing && "animate-spin")} />
                  {isAnalyzing ? "Analysing..." : "Run AI Analysis"}
                </button>
              </div>
            )}
            {/* EVENTS TAB */}
            {activeTab === "events" && (
              <div className="p-2 space-y-1">
                <div className="px-1 py-2 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider">Live Events</span>
                  <span className="text-[10px] text-[#3B82F6] font-medium">{filteredEvents.length}</span>
                </div>
                {filteredEvents.length === 0 && (
                  <div className="text-center py-8 text-[11px] text-[#334155]">No events in current view</div>
                )}
                {filteredEvents.slice(0, 50).map(ev => {
                  const cfg = LAYER_CONFIG.find(l => l.key === ev.type) || LAYER_CONFIG[3];
                  return (
                    <button key={ev.id} onClick={() => setSelectedEvent(ev)}
                      className={cn("w-full text-left px-2.5 py-2 rounded-md text-xs transition-all hover:bg-[#1E2736]",
                        selectedEvent?.id === ev.id ? "bg-[#1E2736] ring-1 ring-[#3B82F6]/30" : "")}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ev.intensity > 0.7 ? "#EF4444" : cfg.color }} />
                        <span className="font-medium text-[#E2E8F0] truncate">{ev.label}</span>
                      </div>
                      <div className="text-[10px] text-[#475569] pl-3.5">
                        {ev.lat.toFixed(3)}, {ev.lng.toFixed(3)} · {new Date(ev.timestamp).toLocaleTimeString()}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {/* NEWS TAB */}
            {activeTab === "news" && (
              <div className="p-2 space-y-1">
                <div className="px-1 py-2 text-[10px] font-semibold text-[#475569] uppercase tracking-wider">Intelligence Feed</div>
                {news.length === 0
                  ? <div className="text-center py-8 text-[11px] text-[#334155]">No feed data</div>
                  : news.map((item, i) => (
                    <a key={i} href={item.url} target="_blank" rel="noreferrer"
                      className="block px-2.5 py-2.5 rounded-md hover:bg-[#1E2736] transition-colors border border-transparent hover:border-[#1E2736]">
                      <div className="text-[10px] text-[#3B82F6] mb-1">{item.source.name} · {new Date(item.publishedAt).toLocaleDateString()}</div>
                      <div className="text-[11px] text-[#CBD5E1] leading-snug line-clamp-2 font-medium">{item.title}</div>
                    </a>
                  ))
                }
              </div>
            )}
            {/* INTEL TAB */}
            {activeTab === "intel" && (
              <div className="p-2 space-y-1">
                <div className="px-1 py-2 text-[10px] font-semibold text-[#475569] uppercase tracking-wider">Knowledge Base</div>
                {cognition.map(lesson => (
                  <div key={lesson.id} className="px-2.5 py-2.5 rounded-md bg-[#0B0E14] border border-[#1E2736] space-y-1">
                    <div className="text-[11px] font-semibold text-[#93C5FD]">{lesson.title}</div>
                    <div className="text-[10px] text-[#64748B] leading-relaxed">{lesson.lesson}</div>
                    <div className="text-[9px] text-[#334155]">{lesson.context}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* System log */}
          <div className="border-t border-[#1E2736] p-2">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Terminal className="w-3 h-3 text-[#334155]" />
              <span className="text-[9px] text-[#334155] font-medium uppercase tracking-wider">System Log</span>
            </div>
            <div className="space-y-0.5 max-h-20 overflow-y-auto">
              {logs.slice(0, 8).map((log, i) => (
                <div key={i} className="text-[9px] text-[#334155] leading-relaxed truncate">{log}</div>
              ))}
            </div>
          </div>
        </aside>
        {/* ── MAP AREA ── */}
        <main className="flex-1 relative min-w-0">
          {/* Loading past data banner */}
          {isLoadingHistory && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-[#0D1117] border border-[#F59E0B]/40 rounded-lg shadow-xl">
              <Clock className="w-3.5 h-3.5 text-[#F59E0B] animate-pulse" />
              <span className="text-xs text-[#F59E0B] font-medium">Loading historical data...</span>
            </div>
          )}
          <IntelMap
            events={historicalEvents ?? filteredEvents}
            selectedEvent={selectedEvent}
            onEventClick={setSelectedEvent}
            region={region}
          />
          <TimeMachine
            onHistoricalData={(data) => { setHistoricalEvents(data); setIsLoadingHistory(false); }}
            onLoadingStart={() => setIsLoadingHistory(true)}
            isLive={isLive}
            setIsLive={setIsLive}
          />
          {/* Analysing overlay */}
          {isAnalyzing && (
            <div className="absolute inset-0 bg-[#0B0E14]/60 flex items-center justify-center z-40 backdrop-blur-sm">
              <div className="bg-[#0D1117] border border-[#1E2736] rounded-xl p-8 text-center space-y-4 max-w-sm">
                <div className="relative w-12 h-12 mx-auto">
                  <Cpu className="w-12 h-12 text-[#3B82F6] animate-pulse" />
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border-2 border-dashed border-[#3B82F6]/20 rounded-full scale-125" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white mb-1">AI Analysis Running</div>
                  <div className="text-xs text-[#64748B]">{analysisStatus}</div>
                </div>
              </div>
            </div>
          )}
        </main>
        {/* ── RIGHT PANEL — event detail + analysis ── */}
        <AnimatePresence>
          {(selectedEvent || analysis) && (
            <motion.aside initial={{ x: 320, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 320, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-80 bg-[#0D1117] border-l border-[#1E2736] flex flex-col shrink-0 z-10">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E2736]">
                <span className="text-xs font-semibold text-white">
                  {selectedEvent ? "Entity Detail" : "AI Assessment"}
                </span>
                <button onClick={() => { setSelectedEvent(null); setAnalysis(null); }}
                  className="p-1 rounded hover:bg-[#1E2736] transition-colors text-[#64748B] hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedEvent && (
                  <div className="space-y-3">
                    <div>
                      <div className="text-[10px] text-[#475569] mb-1 font-medium uppercase tracking-wider">
                        {selectedEvent.type}
                      </div>
                      <div className="text-sm font-semibold text-white leading-snug">{selectedEvent.label}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "Latitude", value: selectedEvent.lat.toFixed(4) },
                        { label: "Longitude", value: selectedEvent.lng.toFixed(4) },
                        { label: "Intensity", value: `${(selectedEvent.intensity * 100).toFixed(0)}%` },
                        { label: "Time", value: new Date(selectedEvent.timestamp).toLocaleTimeString() },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-[#0B0E14] rounded-lg p-2.5 border border-[#1E2736]">
                          <div className="text-[9px] text-[#475569] mb-0.5">{label}</div>
                          <div className="text-xs font-mono text-[#E2E8F0]">{value}</div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-[#0B0E14] rounded-lg p-3 border border-[#1E2736] border-l-2 border-l-[#3B82F6]">
                      <div className="text-[10px] text-[#94A3B8] leading-relaxed">{selectedEvent.details}</div>
                    </div>
                    {!analysis && (
                      <button onClick={() => handleAnalyze(true)} disabled={isAnalyzing}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#3B82F6]/10 text-[#3B82F6] text-xs font-medium hover:bg-[#3B82F6]/20 transition-colors disabled:opacity-50">
                        <Cpu className="w-3.5 h-3.5" /> Analyse this event
                      </button>
                    )}
                  </div>
                )}
                {analysis && (
                  <div className="space-y-3">
                    <div className="bg-[#0B0E14] rounded-xl p-4 border border-[#1E2736]">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] text-[#475569] font-medium uppercase tracking-wider">Threat Score</span>
                        <span className="text-2xl font-bold font-mono" style={{ color: threatColor(analysis.threat_score || 0) }}>
                          {analysis.threat_score || 0}%
                        </span>
                      </div>
                      <div className="w-full bg-[#1E2736] rounded-full h-1.5 overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${analysis.threat_score || 0}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full rounded-full"
                          style={{ background: threatColor(analysis.threat_score || 0) }} />
                      </div>
                      <div className="mt-2 text-[10px] font-semibold" style={{ color: threatColor(analysis.threat_score || 0) }}>
                        {(analysis as any).threat_level || "UNKNOWN"}
                      </div>
                    </div>
                    {(analysis as any).gibs_analyzed && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-[#22C55E]/5 rounded-lg border border-[#22C55E]/20">
                        <div className="w-1.5 h-1.5 bg-[#22C55E] rounded-full" />
                        <span className="text-[10px] text-[#22C55E]">GIBS satellite imagery analysed</span>
                      </div>
                    )}
                    {Array.isArray(analysis.evidence) && analysis.evidence.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider">Evidence</div>
                        {analysis.evidence.map((ev, i) => (
                          <div key={i} className="flex gap-2 text-[10px] text-[#94A3B8] leading-relaxed">
                            <ChevronRight className="w-3 h-3 shrink-0 mt-0.5 text-[#3B82F6]" />
                            <span>{ev}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="bg-[#3B82F6]/5 border border-[#3B82F6]/20 rounded-lg p-3">
                      <div className="text-[10px] font-semibold text-[#3B82F6] mb-1.5">Recommendation</div>
                      <div className="text-[11px] text-[#CBD5E1] leading-relaxed">{analysis.recommendation}</div>
                    </div>
                    <div className="text-[10px] text-[#475569] leading-relaxed">{analysis.summary}</div>
                  </div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
      {/* ── ALERT TOASTS ── */}
      <div className="fixed top-14 right-4 z-50 flex flex-col gap-2 w-72 pointer-events-none">
        <AnimatePresence>
          {alerts.map(alert => (
            <motion.div key={alert.id}
              initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 100, opacity: 0 }}
              className="bg-[#0D1117] border border-red-500/40 rounded-xl p-3.5 pointer-events-auto shadow-2xl cursor-pointer"
              onClick={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-[10px] font-semibold text-red-400">THREAT DETECTED</span>
                </div>
                <span className="text-sm font-bold text-red-400 font-mono">{alert.score}%</span>
              </div>
              <p className="text-[11px] text-[#94A3B8] leading-snug">{alert.msg}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
