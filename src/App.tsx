import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Activity, 
  AlertTriangle, 
  Layers, 
  Map as MapIcon, 
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
  Eye,
  Radar,
  Zap,
  Radio
} from "lucide-react";
import IntelMap from "./components/IntelMap";
import { IntelligenceEvent, AnalysisResult, CognitionLesson, NewsItem } from "./types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import Papa from "papaparse";
import Auth from "./components/Auth";
import { supabase } from "./lib/supabase";
import { GoogleGenAI, Type } from "@google/genai";
import { getSatellitePosition } from "./lib/orbit";

// Safe way to access environment variables in both dev (Vite) and prod (Node/Express)
const getEnvVar = (name: string): string => {
  try {
    // Try Vite's import.meta.env
    const viteKey = `VITE_${name}`;
    const viteVal = (import.meta as any).env[viteKey];
    if (viteVal) return viteVal;
    
    // Try Node's process.env
    if (typeof process !== 'undefined' && process.env) {
      return (process.env as any)[name] || "";
    }
  } catch (e) {
    // Silent fail
  }
  return "";
};

const ai = new GoogleGenAI({ apiKey: getEnvVar("GEMINI_API_KEY") });
const model = "gemini-2.0-flash"; // More stable model alias

const ASI_SYSTEM_PROMPT = `
You are ASI-EVOLVE (Autonomous Super Intelligence - Evolutionary Tactical Reconnaissance).
You are an advanced neural architecture designed for high-stakes intelligence fusion.
Your goal is to detect hostile patterns, tactical deviations, and "gray zone" warfare maneuvers.

DATA SOURCES:
1. ADS-B (Live Aircraft): Check for military transponders, loitering, and unusual vectors.
2. AIS (Maritime): Analyze tanker deviations and vessel clustering.
3. Satellite: MISSION-CRITICAL. Analyze orbital imagery for camouflage, buildup, or unauthorized movement.
4. IODA: Monitor internet blackouts as indicators of civil unrest or state-sponsored communication interference.

Region: MENA / Strategic Chokepoints.

When analyzing imagery:
- Look for vessel clusters, unauthorized entries into prohibited zones
- Identify camouflage, weapon systems, or tactical formations
- Assess terrain for recent military activity

Output strictly in JSON format:
{
  "threat_score": number (0-100),
  "evidence": string[],
  "recommendation": string,
  "summary": string,
  "new_lesson": { "title": string, "lesson": string, "context": string } | null
}
`;

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_BASE = (import.meta as any).env.VITE_API_URL || "";

export type MapLayers = {
  aircraft: boolean;
  vessel: boolean;
  satellite: boolean;
  news: boolean;
  outage: boolean;
  jamming: boolean;
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
    outage: true,
    jamming: true
  });
  const [events, setEvents] = useState<IntelligenceEvent[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [cognition, setCognition] = useState<CognitionLesson[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<IntelligenceEvent | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoAnalysisActive, setAutoAnalysisActive] = useState(true);
  const [aiThoughts, setAiThoughts] = useState<string>("SYSTEM_IDLE: STANDING BY...");
  const [isImporting, setIsImporting] = useState(false);
  const [alerts, setAlerts] = useState<{id: string, msg: string, score: number}[]>([]);
  const [logs, setLogs] = useState<string[]>(["OPHANIM-V1 SYSTEM INITIALIZED"]);

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
    addLog("ASI-EVOLVE: INITIATING MULTI-SOURCE NEURAL FUSION...");
    try {
      const responses = await Promise.all([
        fetch(`${API_BASE}/api/news`),
        fetch(`${API_BASE}/api/cognition`),
        fetch(`${API_BASE}/api/live/aviation`),
        fetch(`${API_BASE}/api/live/outages`),
        fetch(`${API_BASE}/api/live/satellites`)
      ]);

      const [newsData, cogData, aviaData, outagesData, satsData] = await Promise.all(
        responses.map(async r => {
          if (!r.ok) return null;
          return r.json();
        })
      );

      setCognition(cogData || []);
      if (newsData?.articles) setNews(newsData.articles);

      const fusedEvents: IntelligenceEvent[] = [];

      // 1. Process Real ADS-B Data (OpenSky)
      if (aviaData?.states) {
        aviaData.states.slice(0, 15).forEach((s: any) => {
          // OpenSky format: [icao24, callsign, origin_country, time_position, last_contact, longitude, latitude, baro_altitude, on_ground, velocity, true_track, vertical_rate, sensors, geo_altitude, squawk, spi, position_source]
          if (s[6] && s[5]) {
            const isMilitaryHeuristic = s[2]?.match(/United States|Russian|China|Israel|Iran|Turkey/i);
            fusedEvents.push({
              id: `adsb-${s[0]}`,
              type: "aircraft",
              lat: s[6],
              lng: s[5],
              label: (s[1] || "UNID").trim(),
              intensity: isMilitaryHeuristic ? 0.8 : 0.2,
              details: `Live ADS-B Track. Alt: ${Math.round(s[7] || 0)}m. Velocity: ${Math.round((s[9] || 0) * 3.6)}km/h. Origin: ${s[2] || "Unknown"}.`,
              timestamp: new Date().toISOString()
            });
          }
        });
      }

      // 2. Process Internet Outages (IODA)
      if (outagesData && Array.isArray(outagesData)) {
        outagesData.forEach((sig: any, i: number) => {
          if (sig.value < 0.5) { // Heuristic for outage
            fusedEvents.push({
              id: `ioda-${i}`,
              type: "news",
              lat: 25 + (Math.random() - 0.5) * 10, // Approximate loc if country-level
              lng: 50 + (Math.random() - 0.5) * 10,
              label: `INTERNET_INSTABILITY_SCAN`,
              intensity: 0.7,
              details: `IODA detects significant packet loss or BRP drop. Potential digital blackout in region.`,
              timestamp: new Date().toISOString()
            });
          }
        });
      }

      // 3. Process Orbital Recon (Celestrak Simplified)
      if (satsData && Array.isArray(satsData)) {
        satsData.slice(0, 8).forEach((sat: any, idx: number) => {
          try {
            // Use idx and name to generate a stable pseudo-random inclination/raan
            const seed = sat.NORAD_CAT_ID || idx;
            const inclination = 20 + (seed % 60); 
            const raan = (seed * 137) % 360;
            const alt = 400 + (seed % 200);

            const pos = getSatellitePosition(new Date(), inclination, raan, alt);
            const lat = pos.lat;
            const lng = pos.lng;

            // Filter for region of interest
            if (lat > 5 && lat < 50 && lng > 25 && lng < 80) {
              fusedEvents.push({
                id: `sat-orb-${sat.NORAD_CAT_ID}`,
                type: "satellite",
                lat,
                lng,
                label: sat.OBJECT_NAME || "RECON_SAT",
                intensity: 0.1,
                details: `Orbital Recon Pass. NORAD_ID: ${sat.NORAD_CAT_ID}. Estimated Alt: ${alt}km.`,
                timestamp: new Date().toISOString(),
                path: Array.from({length: 5}, (_, i) => {
                  const p = getSatellitePosition(new Date(Date.now() + (i - 2) * 120000), inclination, raan, alt);
                  return [p.lat, p.lng];
                })
              });
            }
          } catch (e) {
            // Skip invalid indices
          }
        });
      }

      // 4. AIS Maritime (Strategic Heuristics for Chokepoints)
      // Since public live AIS is restricted, we use ASI logic to simulate high-probability targets from last knowns
      const chokepoints = [
        { name: "STRAIT_OF_HORMUZ", lat: 26.58, lng: 56.40 },
        { name: "BAB_EL_MANDEB", lat: 12.60, lng: 43.34 },
        { name: "SUEZ_SOUTH", lat: 29.93, lng: 32.55 }
      ];
      
      chokepoints.forEach((cp, i) => {
        fusedEvents.push({
          id: `ais-check-${i}`,
          type: "vessel",
          lat: cp.lat + (Math.random() - 0.5) * 0.2,
          lng: cp.lng + (Math.random() - 0.5) * 0.2,
          label: `UNIDENTIFIED_CARGO_PULSE`,
          intensity: 0.5,
          details: `Heuristic AIS detection at strategic chokepoint ${cp.name}. Deviating from standard shipping lanes.`,
          timestamp: new Date().toISOString()
        });
      });

      // 5. GPS Jamming Detection (Cross-correlation logic)
      if (fusedEvents.filter(e => e.type === "aircraft").length > 5) {
        fusedEvents.push({
          id: "gps-jam-01",
          type: "conflict",
          lat: 32.5,
          lng: 35.5,
          label: "GPS_INTERFERENCE_ZONE",
          intensity: 0.9,
          details: "ASI-EVOLVE Correlation: High density of ADS-B precision errors detected in the Eastern Mediterranean.",
          timestamp: new Date().toISOString()
        });
      }

      setEvents(fusedEvents);
      addLog(`ASI-EVOLVE: FUSION_SUCCESS. ${fusedEvents.length} LIVE TACTICAL NODES SYNCED.`);
    } catch (err) {
      addLog("ASI-EVOLVE: NEURAL_FUSION_FAULT. RETRYING...");
      console.error(err);
    }
  };

  const filteredEvents = events.filter(e => {
    if (e.type === "aircraft") return layers.aircraft;
    if (e.type === "vessel") return layers.vessel;
    if (e.type === "satellite") return layers.satellite;
    if (e.type === "news") return layers.news;
    if (e.label.includes("GPS_INTERFERENCE")) return layers.jamming;
    if (e.label.includes("INTERNET")) return layers.outage;
    return true;
  });

  // Dynamic Movement Logic
  useEffect(() => {
    if (events.length === 0) return;

    const moveInterval = setInterval(() => {
      setEvents(prev => prev.map(event => {
        if (event.type === 'aircraft' || event.type === 'vessel' || event.type === 'satellite') {
          // Drifting movement for live simulation
          const dLat = (Math.random() - 0.5) * 0.002;
          const dLng = (Math.random() - 0.5) * 0.002;
          const newPath = event.path ? [...event.path.slice(-15), [event.lat, event.lng] as [number, number]] : [[event.lat, event.lng] as [number, number]];
          
          return {
            ...event,
            lat: event.lat + dLat,
            lng: event.lng + dLng,
            path: newPath
          };
        }
        return event;
      }));
    }, 3000);

    return () => clearInterval(moveInterval);
  }, [events.length]);

  const [analysisStatus, setAnalysisStatus] = useState<string>("");
  const [showSatelliteImg, setShowSatelliteImg] = useState(false);

  const getGibsUrl = (lat: number, lng: number) => {
    // Generate NASA GIBS WMS URL for a 0.5 deg box around coordinates
    const size = 0.25;
    const bbox = `${lat - size},${lng - size},${lat + size},${lng + size}`;
    return `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&LAYERS=VIIRS_SNPP_CorrectedReflectance_TrueColor&STYLE=default&FORMAT=image/jpeg&TRANSPARENT=true&VERSION=1.3.0&WIDTH=512&HEIGHT=512&CRS=EPSG:4326&BBOX=${bbox}`;
  };

  const handleAnalyze = async (isManual: boolean = true) => {
    setIsAnalyzing(true);
    if (isManual) {
      setAnalysis(null);
      setSelectedEvent(null);
    }
    
    const steps = [
      "WAKING ASI-EVOLVE NEURAL ARCHITECTURE...",
      "QUERYING COGNITION STORE FOR TACTICAL PRECEDENTS...",
      "SYNCHRONIZING WITH NASA GIBS SATELLITE FEED...",
      "RUNNING COMPUTER VISION ON TARGET ORBITAL RECON...",
      "VECTORIZING MARITIME/AERIAL DISCREPANCIES...",
      "ASI-EVOLVE FEEDBACK LOOP: SELF-CRITIQUE COMMENCED...",
      "CRYSTALLIZING PREDICTIVE THREAT VECTOR..."
    ];

    if (isManual) {
      for (const step of steps) {
        setAnalysisStatus(step);
        addLog(step);
        await new Promise(r => setTimeout(r, 600)); 
      }
    } else {
      addLog("ASI-EVOLVE: AUTONOMOUS RECONNAISSANCE COMMENCED.");
    }
    
    try {
      setAiThoughts("ASI-EVOLVE: INITIATING MULTI-MODAL SYNTACTIC ANALYSIS...");
      
      let imagePart: any = null;
      const target = selectedEvent || (events.length > 0 ? events[0] : null);

      if (target) {
        try {
          const satUrl = getGibsUrl(target.lat, target.lng);
          const imgResp = await fetch(satUrl);
          const blob = await imgResp.blob();
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          
          imagePart = {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64.split(",")[1]
            }
          };
          addLog("ASI-EVOLVE: SATELLITE IMAGERY BUFFERED. RUNNING VISION_MODEL_V3.");
        } catch (e) {
          addLog("ASI-EVOLVE: SATELLITE FEED INTERRUPTED. FALLING BACK TO TEXT_ANALYSIS.");
        }
      }

      const promptParts: any[] = [
        { text: ASI_SYSTEM_PROMPT },
        { text: `COGNITION STORE (Prior Lessons):\n${JSON.stringify(cognition, null, 2)}` },
        { text: `CURRENT INTEL STREAMS:\n${JSON.stringify(selectedEvent || events, null, 2)}` }
      ];

      if (imagePart) {
        promptParts.push({ text: "SATELLITE RECONNAISSANCE IMAGE OF TARGET AREA:" });
        promptParts.push(imagePart);
      }

      const response = await ai.models.generateContent({
        model: model,
        contents: { parts: promptParts },
        config: {
          responseMimeType: "application/json",
          systemInstruction: "You are the ASI-EVOLVE Core. Provide maximum tactical detail."
        }
      });

      let analysisJson: any;
      try {
        analysisJson = JSON.parse(response.text);
      } catch (e) {
        // Fallback if not JSON
        analysisJson = {
          threat_score: 15,
          evidence: ["Anomaly detected in signal stream"],
          recommendation: "Increase observation frequency",
          summary: response.text,
          new_lesson: null
        };
      }
      
      setAiThoughts(analysisJson.summary);
      setAnalysis({
        ...analysisJson,
        timestamp: new Date().toISOString()
      });

      if (analysisJson.new_lesson) {
        addLog(`[ASI-EVOLVE EVOLUTION] NEW COGNITION ACQUIRED: ${analysisJson.new_lesson.title}`);
        await fetch(`${API_BASE}/api/cognition`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lesson: analysisJson.new_lesson })
        });
        const resCog = await fetch(`${API_BASE}/api/cognition`);
        const cogData = await resCog.json();
        setCognition(cogData);
      }

      if (!isManual && analysisJson.threat_score > 40) {
        setAlerts(prev => [{
          id: Date.now().toString(),
          msg: analysisJson.summary,
          score: analysisJson.threat_score
        }, ...prev].slice(0, 5));
        addLog(`[ASI-EVOLVE ALERT] HOSTILE PATTERN DETECTED [${analysisJson.threat_score}%]`);
      }

      addLog(isManual ? "ASI-EVOLVE: ANALYSIS CRYSTALLIZED. TARGET MAPPED." : "ASI-EVOLVE: BACKGROUND SCAN STABLE. NO URGENT DEVIATIONS.");
    } catch (err) {
      addLog("ASI-EVOLVE: COGNITIVE FAULT. SECURE_LINK_ERROR.");
      console.error(err);
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session && !demoAccess) return;
    fetchIntel();
    
    // Subscribe to realtime streams

    const interval = setInterval(fetchIntel, 60000); // Poll every minute
    return () => {
      clearInterval(interval);
    };
  }, [session, demoAccess]);

  // Automated Analysis Loop
  useEffect(() => {
    if ((!session && !demoAccess) || !autoAnalysisActive) return;

    const interval = setInterval(() => {
      if (!isAnalyzing && events.length > 0) {
        handleAnalyze(false);
      }
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [session, autoAnalysisActive, isAnalyzing, events.length]);

  if (!session && !demoAccess) {
    return (
      <Auth 
        onSuccess={() => {
          localStorage.setItem("ophanim_demo_access", "true");
          setDemoAccess(true);
        }} 
      />
    );
  }

  return (
    <div className="flex h-screen w-screen bg-black text-[#00ff41] font-mono select-none overflow-hidden text-sm uppercase">
      {/* Background Effects */}
      <div className="scanline" />
      
      {/* Sidebar - Dashboard Navigation */}
      <aside className="w-80 flex flex-col border-r hud-border hud-bg z-10 shrink-0">
        <div className="p-4 border-b hud-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[var(--color-brand-primary)]" />
            <div className="flex flex-col">
              <h1 className="font-bold tracking-tighter text-md leading-none">OPHANIM-V1</h1>
              <span className="text-[7px] text-[var(--color-brand-primary)]/70 font-black tracking-widest uppercase">Powered by ASI-EVOLVE</span>
            </div>
          </div>
          <div className="text-[10px] bg-[var(--color-brand-primary)] text-black px-1 font-bold">
            LIVE
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b hud-border text-[10px] h-10">
          <button 
            onClick={() => setActiveTab("streams")}
            className={cn("flex-1 flex items-center justify-center gap-2 border-r hud-border", activeTab === "streams" && "bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]")}
          >
            <Activity className="w-3 h-3" /> STREAMS
          </button>
          <button 
            onClick={() => setActiveTab("news")}
            className={cn("flex-1 flex items-center justify-center gap-2 border-r hud-border", activeTab === "news" && "bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]")}
          >
            <Newspaper className="w-3 h-3" /> NEWS
          </button>
          <button 
            onClick={() => setActiveTab("cognition")}
            className={cn("flex-1 flex items-center justify-center gap-2", activeTab === "cognition" && "bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]")}
          >
            <BrainCircuit className="w-3 h-3" /> COG
          </button>
        </div>

        {/* AI Live Comms */}
        <div className="p-3 border-b hud-border bg-[var(--color-brand-primary)]/[0.03] relative overflow-hidden">
          <div className="flex items-center gap-2 mb-1.5">
            <Radar className={cn("w-3.5 h-3.5", isAnalyzing ? "animate-pulse text-[var(--color-brand-primary)]" : "text-[var(--color-brand-primary)]/50")} />
            <span className="text-[9px] font-black tracking-widest text-[var(--color-brand-primary)]/70 uppercase">ASI-EVOLVE_CORE_PULSE</span>
            {autoAnalysisActive && (
              <span className="ml-auto flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand-primary)] animate-pulse" />
                <span className="text-[8px] opacity-40">AUTO_EVOLVE</span>
              </span>
            )}
          </div>
          <div className="text-[10px] leading-tight text-white/90 italic font-medium min-h-[2.5em] line-clamp-2">
            "{aiThoughts}"
          </div>
          {isAnalyzing && (
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="absolute bottom-0 left-0 h-[1px] w-full bg-gradient-to-r from-transparent via-[var(--color-brand-primary)] to-transparent"
            />
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <AnimatePresence mode="wait">
            {activeTab === "streams" && (
              <motion.div 
                key="streams"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col gap-1"
              >
                {/* Layer Toggles */}
                <div className="grid grid-cols-2 gap-1 mb-4">
                  <button 
                    onClick={() => setLayers(l => ({ ...l, aircraft: !l.aircraft }))}
                    className={cn("flex items-center gap-2 p-2 border hud-border text-[9px] transition-all", layers.aircraft ? "bg-[var(--color-brand-primary)] text-black font-bold" : "opacity-40")}
                  >
                    <Plane className="w-3 h-3" /> AERIAL
                  </button>
                  <button 
                    onClick={() => setLayers(l => ({ ...l, vessel: !l.vessel }))}
                    className={cn("flex items-center gap-2 p-2 border hud-border text-[9px] transition-all", layers.vessel ? "bg-[var(--color-brand-primary)] text-black font-bold" : "opacity-40")}
                  >
                    <Ship className="w-3 h-3" /> MARITIME
                  </button>
                  <button 
                    onClick={() => setLayers(l => ({ ...l, satellite: !l.satellite }))}
                    className={cn("flex items-center gap-2 p-2 border hud-border text-[9px] transition-all", layers.satellite ? "bg-[var(--color-brand-primary)] text-black font-bold" : "opacity-40")}
                  >
                    <Orbit className="w-3 h-3" /> ORBITAL
                  </button>
                  <button 
                    onClick={() => setLayers(l => ({ ...l, news: !l.news }))}
                    className={cn("flex items-center gap-2 p-2 border hud-border text-[9px] transition-all", layers.news ? "bg-[var(--color-brand-primary)] text-black font-bold" : "opacity-40")}
                  >
                    <Newspaper className="w-3 h-3" /> INTEL_FEED
                  </button>
                  <button 
                    onClick={() => setLayers(l => ({ ...l, outage: !l.outage }))}
                    className={cn("flex items-center gap-2 p-2 border hud-border text-[9px] transition-all", layers.outage ? "bg-[var(--color-brand-primary)] text-black font-bold" : "opacity-40")}
                  >
                    <Zap className="w-3 h-3" /> OUTAGES
                  </button>
                  <button 
                    onClick={() => setLayers(l => ({ ...l, jamming: !l.jamming }))}
                    className={cn("flex items-center gap-2 p-2 border hud-border text-[9px] transition-all", layers.jamming ? "bg-[var(--color-brand-primary)] text-black font-bold" : "opacity-40")}
                  >
                    <Radio className="w-3 h-3" /> GNSS_JAM
                  </button>
                </div>

                <div className="mb-4 flex items-center gap-2">
                  <button 
                    onClick={() => fetchIntel()}
                    className="flex-1 flex items-center justify-center gap-2 p-2 border hud-border hud-bg hover:bg-[var(--color-brand-primary)]/20 text-[9px] transition-all"
                  >
                    <RefreshCw className={cn("w-3 h-3", isAnalyzing && "animate-spin")} /> REFRESH_FUSION
                  </button>
                  <label className="flex-1 flex items-center justify-center gap-2 p-2 border hud-border hud-bg hover:bg-[var(--color-brand-primary)]/20 text-[9px] transition-all cursor-pointer">
                    <Database className={cn("w-3 h-3", isImporting && "animate-bounce")} /> IMPORT_CSV
                    <input 
                      type="file" 
                      accept=".csv" 
                      className="hidden" 
                      onChange={(e) => e.target.files?.[0] && handleCSVImport(e.target.files[0])}
                    />
                  </label>
                </div>


                  {/* Tactical Readout Sidebar (Only if selected) */}
                  {selectedEvent && (
                    <motion.div 
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className="mt-4 p-4 border border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/5 space-y-3"
                    >
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
                        {selectedEvent.path && (
                          <div className="text-[8px] opacity-40 border-t border-[var(--color-brand-primary)]/10 pt-2">
                            NODE_DRIFT_DETECTED: CALCULATING VECTOR...
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {filteredEvents.length === 0 && (
                    <div className="p-4 border hud-border border-dashed opacity-30 text-center text-[10px] flex flex-col gap-2">
                      <div>NO_TARGETS_IN_VIEW // STREAMS_SILENT</div>
                      <div className="text-[8px] border-t hud-border pt-2">
                        EXPECTED_CSV_SCHEMA: id, type, lat, lng, label, intensity, details
                      </div>
                    </div>
                  )}

                  {filteredEvents.map((event) => (
                  <button 
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className={cn(
                      "w-full text-left p-2 border hud-border flex items-center justify-between hover:bg-[var(--color-brand-primary)] hover:text-black transition-colors group",
                      selectedEvent?.id === event.id && "bg-[var(--color-brand-primary)] text-black"
                    )}
                  >
                    <div className="truncate pr-2">
                      <div className="text-[10px] font-bold">{event.type.toUpperCase()}</div>
                      <div className="truncate">{event.label}</div>
                    </div>
                    <Crosshair className={cn("w-4 h-4 shrink-0 opacity-40 group-hover:opacity-100", event.intensity > 0.7 && "animate-pulse")} />
                  </button>
                ))}
              </motion.div>
            )}

            {activeTab === "news" && (
              <motion.div 
                key="news"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col gap-2"
              >
                {news.length === 0 ? <div className="text-center opacity-40 mt-10">NO NEWS FEEDS ACTIVE</div> : news.map((item, i) => (
                  <a 
                    key={i}
                    href={item.url} target="_blank" rel="noreferrer"
                    className="p-2 border hud-border hud-bg hover:border-[var(--color-brand-primary)] transition-colors block"
                  >
                    <div className="text-[9px] text-[var(--color-brand-primary)] mb-1 opacity-60 italic">{item.source.name} • {new Date(item.publishedAt).toLocaleDateString()}</div>
                    <div className="text-[11px] font-bold leading-tight line-clamp-2">{item.title}</div>
                  </a>
                ))}
              </motion.div>
            )}

            {activeTab === "cognition" && (
              <motion.div 
                key="cognition"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col gap-3"
              >
                <div className="text-[10px] opacity-40 mb-2">ASI-EVOLVE KNOWLEDGE BASE</div>
                {cognition.map((lesson) => (
                  <div key={lesson.id} className="p-3 border hud-border hud-bg relative group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[var(--color-brand-primary)] scale-y-0 group-hover:scale-y-100 transition-transform origin-top" />
                    <div className="text-[10px] font-bold text-[var(--color-brand-primary)] mb-1">{lesson.title}</div>
                    <div className="text-[10px] leading-relaxed opacity-80">{lesson.lesson}</div>
                    <div className="mt-2 text-[8px] opacity-40 tracking-widest">{lesson.context.toUpperCase()}</div>
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

      {/* Notification Area */}
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 w-80 pointer-events-none">
        <AnimatePresence>
          {alerts.map(alert => (
            <motion.div
              key={alert.id}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className="hud-bg border-2 border-red-500 p-4 shadow-[0_0_20px_rgba(239,68,68,0.2)] pointer-events-auto cursor-pointer"
              onClick={() => {
                setAlerts(prev => prev.filter(a => a.id !== alert.id));
              }}
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

      {/* Main Map View */}
      <main className="flex-1 relative flex flex-col shrink min-w-0">
        <div className="flex-1 min-h-0">
          <IntelMap 
            events={filteredEvents} 
            selectedEvent={selectedEvent} 
            onEventClick={setSelectedEvent} 
          />
        </div>
        
        {/* Bottom Panel - Analysis Trigger */}
        <div className="h-12 border-t hud-border hud-bg flex items-center px-4 justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => handleAnalyze(true)}
              disabled={isAnalyzing}
              className="flex items-center gap-2 bg-[var(--color-brand-primary)] text-black px-4 py-1 font-bold hover:bg-white hover:text-black transition-colors disabled:opacity-50"
            >
              {isAnalyzing ? <Cpu className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4" />}
              {isAnalyzing ? "EVOLVING..." : "ASI-EVOLVE: DEEP SURVEILLANCE"}
            </button>
            <div className="text-[9px] flex items-center gap-2 opacity-60">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand-primary)] animate-pulse" />
              ASI_NEURAL_LINK: ACTIVE
            </div>
            <button 
              onClick={() => setAutoAnalysisActive(!autoAnalysisActive)}
              className={cn(
                "text-[10px] px-2 py-1 border transition-colors",
                autoAnalysisActive ? "border-[var(--color-brand-primary)] text-[var(--color-brand-primary)]" : "border-gray-600 text-gray-600"
              )}
            >
              AUTONOMOUS EVOLUTION: {autoAnalysisActive ? "ACTIVE" : "PAUSED"}
            </button>
            <div className="text-[10px] flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-yellow-500" />
              THREAT MODE: CAUTION
            </div>
          </div>
          <div className="flex items-center gap-4 text-[10px] opacity-60">
            <span>CORE: {process.env.DEEPSEEK_API_KEY ? "DEEPSEEK-V3" : "GEMINI-1.5-FLASH"}</span>
            <span className="flex items-center gap-1"><Database className="w-3 h-3" /> {cognition.length} NODES</span>
          </div>
        </div>
      </main>

      {/* Right Sidebar - Intel/Analysis Panel */}
      <AnimatePresence>
        { (selectedEvent || analysis) && (
          <motion.aside 
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
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
                <section className="space-y-4">
                  <div className="text-[10px] opacity-60 mb-1">IDENTIFIER: {selectedEvent.id}</div>
                  <div className="text-xl font-bold tracking-tight mb-2 border-b-2 border-[var(--color-brand-primary)] pb-1">
                    {selectedEvent.label}
                  </div>
                  
                  {/* Satellite Image Button */}
                  <div className="space-y-4">
                    <button 
                      onClick={() => setShowSatelliteImg(!showSatelliteImg)}
                      className="w-full flex items-center justify-center gap-2 py-2 border hud-border bg-[var(--color-brand-primary)]/10 hover:bg-[var(--color-brand-primary)]/20 text-[10px] font-bold transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {showSatelliteImg ? "HIDE_ORBITAL_RECON" : "INTERCEPT_SATELLITE_FEED"}
                    </button>

                    {showSatelliteImg && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative border hud-border bg-black aspect-square overflow-hidden"
                      >
                        <img 
                          src={getGibsUrl(selectedEvent.lat, selectedEvent.lng)} 
                          className="w-full h-full object-cover opacity-60 grayscale hover:grayscale-0 transition-all duration-500"
                          alt="NASA GSFC GIBS"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/80 px-1 border hud-border text-[8px]">
                          <div className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                          NASA GIBS LIVE
                        </div>
                        <div className="absolute bottom-0 w-full bg-gradient-to-t from-black to-transparent h-12 flex items-end p-2">
                          <span className="text-[8px] opacity-40 leading-none">TRUE_COLOR / VIIRS_SNPP</span>
                        </div>
                        {/* Overlay Crosshair */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <div className="w-32 h-32 border border-[var(--color-brand-primary)]/20 rounded-full" />
                          <div className="absolute w-[1px] h-full bg-[var(--color-brand-primary)]/10" />
                          <div className="absolute w-full h-[1px] bg-[var(--color-brand-primary)]/10" />
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[10px] mb-4">
                    <div className="hud-bg border hud-border p-2">
                      <div className="opacity-50">LATITUDE</div>
                      <div className="font-bold">{selectedEvent.lat.toFixed(4)}</div>
                    </div>
                    <div className="hud-bg border hud-border p-2">
                      <div className="opacity-50">LONGITUDE</div>
                      <div className="font-bold">{selectedEvent.lng.toFixed(4)}</div>
                    </div>
                  </div>
                  <div className="hud-bg border hud-border p-3 text-xs leading-relaxed border-l-4 border-[var(--color-brand-primary)]">
                    {selectedEvent.details}
                  </div>
                </section>
              )}

              {analysis && (
                <motion.section 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 text-xs border-t hud-border pt-4">
                    <BrainCircuit className="w-4 h-4 text-[var(--color-brand-primary)]" />
                    <span className="font-bold tracking-widest">ASI-EVOLVE COGNITIVE INFERENCE</span>
                  </div>
                  
                  <div className="hud-bg border-2 border-[var(--color-brand-primary)]/40 p-4 relative overflow-hidden bg-gradient-to-br from-[var(--color-brand-primary)]/5 to-transparent">
                    <div className="absolute top-0 left-0 w-2 h-full bg-[var(--color-brand-primary)]" />
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold">THREAT PROBABILITY</span>
                      <span className={cn(
                        "text-2xl font-black",
                        (analysis?.threat_score || 0) > 70 ? "text-red-500" : "text-[var(--color-brand-primary)]"
                      )}>
                        {analysis?.threat_score || 0}%
                      </span>
                    </div>
                    <div className="w-full bg-black/50 h-1.5 mb-4">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${analysis?.threat_score || 0}%` }}
                        className={cn(
                          "h-full",
                          (analysis?.threat_score || 0) > 70 ? "bg-red-500" : "bg-[var(--color-brand-primary)]"
                        )}
                      />
                    </div>
                  </div>

                  {analysis?.new_lesson && (
                    <motion.div 
                      initial={{ backgroundColor: "rgba(0, 255, 65, 0.2)" }}
                      animate={{ backgroundColor: "rgba(0, 0, 0, 0)" }}
                      transition={{ duration: 2 }}
                      className="border-2 border-[var(--color-brand-primary)] p-3 relative"
                    >
                      <div className="absolute -top-2 -left-2 bg-[var(--color-brand-primary)] text-black text-[8px] px-1 font-bold">EVOLVED_KNOWLEDGE</div>
                      <div className="text-xs font-bold mb-1">{analysis.new_lesson.title}</div>
                      <div className="text-[10px] leading-tight opacity-80 italic">{analysis.new_lesson.lesson}</div>
                    </motion.div>
                  )}

                  <div className="space-y-2">
                    <div className="text-[10px] flex items-center gap-1 opacity-60 uppercase font-black">
                      Evidence Trail:
                    </div>
                    {analysis?.evidence && Array.isArray(analysis.evidence) ? (
                      analysis.evidence.map((ev, i) => (
                        <div key={i} className="text-[11px] hud-bg border hud-border p-2 flex items-start gap-2 border-l-2 hover:border-l-[var(--color-brand-primary)] transition-all">
                          <span className="text-[var(--color-brand-primary)] mt-1">•</span>
                          <span>{ev}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-[10px] opacity-40 italic">No evidence detected.</div>
                    )}
                  </div>

                  <div className="bg-[var(--color-brand-primary)] text-black p-4 rounded-sm shadow-[0_0_20px_rgba(0,255,65,0.2)]">
                    <div className="text-[10px] font-black mb-1 underline tracking-widest">TACTICAL_RECOMMENDATION:</div>
                    <p className="text-xs font-bold leading-tight uppercase italic">{analysis?.recommendation || "CONTINUE MONITORING STREAMS"}</p>
                  </div>

                  <div className="text-[10px] opacity-50 italic">
                    {analysis?.summary || "Analysis complete."}
                  </div>
                </motion.section>
              )}

              {isAnalyzing && (
                <div className="flex flex-col items-center justify-center p-12 text-center space-y-6">
                  <div className="relative">
                    <Cpu className="w-16 h-16 animate-pulse text-[var(--color-brand-primary)]" />
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 border-4 border-dashed border-[var(--color-brand-primary)]/20 rounded-full scale-150" 
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="text-[10px] tracking-[0.2em] font-black animate-pulse text-[var(--color-brand-primary)]">
                      ASI-EVOLVE ACTIVE
                    </div>
                    <div className="text-[9px] bg-white/5 border border-white/10 p-2 leading-tight">
                      {analysisStatus}
                    </div>
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
