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
  Search
} from "lucide-react";
import IntelMap from "./components/IntelMap";
import { IntelligenceEvent, AnalysisResult, CognitionLesson, NewsItem } from "./types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import Auth from "./components/Auth";
import { supabase } from "./lib/supabase";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_BASE = (import.meta as any).env.VITE_API_URL || "";

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [demoAccess, setDemoAccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"streams" | "news" | "cognition">("streams");
  const [events, setEvents] = useState<IntelligenceEvent[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [cognition, setCognition] = useState<CognitionLesson[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<IntelligenceEvent | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoAnalysisActive, setAutoAnalysisActive] = useState(true);
  const [alerts, setAlerts] = useState<{id: string, msg: string, score: number}[]>([]);
  const [logs, setLogs] = useState<string[]>(["OPHANIM-V1 SYSTEM INITIALIZED"]);

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 50));
  };

  const fetchIntel = async () => {
    addLog("POLLING DATA STREAMS...");
    try {
      const newsPromise = fetch(`${API_BASE}/api/news`).then(r => r.json());
      const cogPromise = fetch(`${API_BASE}/api/cognition`).then(r => r.json());
      const nasaPromise = fetch(`${API_BASE}/api/nasa`).then(r => r.json());
      const aviaPromise = fetch(`${API_BASE}/api/aviation`).then(r => r.json());

      const [newsData, cogData, nasaData, aviaData] = await Promise.all([
        newsPromise, cogPromise, nasaPromise, aviaPromise
      ]);

      if (newsData.articles) setNews(newsData.articles);
      setCognition(cogData);

      const scrapedEvents: IntelligenceEvent[] = [];

      // Process NASA EONET events
      if (nasaData.events) {
        nasaData.events.forEach((e: any) => {
          if (e.geometry && e.geometry[0]) {
            scrapedEvents.push({
              id: "nasa-" + e.id,
              type: "news",
              lat: e.geometry[0].coordinates[1],
              lng: e.geometry[0].coordinates[0],
              label: "NASA: " + e.title,
              intensity: 0.5,
              details: "Environmental event detected: " + e.description || "Active event monitor.",
              timestamp: e.geometry[0].date
            });
          }
        });
      }

      // Process Aviation Stack data
      if (aviaData.data) {
        aviaData.data.forEach((f: any, i: number) => {
          if (f.live && f.live.latitude) {
            scrapedEvents.push({
              id: "flight-" + i,
              type: "aircraft",
              lat: f.live.latitude,
              lng: f.live.longitude,
              label: f.flight.iata || "FLIGHT-UNID",
              intensity: 0.2,
              details: `Flight ${f.flight.number} from ${f.departure.airport} to ${f.arrival.airport}. Speed: ${f.live.speed_horizontal}km/h`,
              timestamp: new Date().toISOString()
            });
          }
        });
      }

      // Add baseline MENA events if specific areas aren't covered
      if (scrapedEvents.length < 3) {
        scrapedEvents.push(
          {
            id: "v-hor-" + Date.now(),
            type: "vessel",
            lat: 26.5 + (Math.random() - 0.5) * 0.5,
            lng: 56.4 + (Math.random() - 0.5) * 0.5,
            label: "TANKER-GUARD-08",
            intensity: 0.4,
            details: "Detected tactical circling patterns in the Strait of Hormuz.",
            timestamp: new Date().toISOString()
          },
          {
            id: "a-red-" + Date.now(),
            type: "aircraft",
            lat: 13.5,
            lng: 42.8,
            label: "RED-SEA-ISR",
            intensity: 0.9,
            details: "High-altitude loitering detected over Bab el-Mandeb.",
            timestamp: new Date().toISOString()
          }
        );
      }

      setEvents(scrapedEvents);
      addLog(`FUSION COMPLETE. ${scrapedEvents.length} TACTICAL NODES SYNCED.`);
    } catch (err) {
      addLog("INTEL FUSION FAILED: CHECK API CONFIG.");
      console.error(err);
    }
  };

  const [analysisStatus, setAnalysisStatus] = useState<string>("");

  const handleAnalyze = async (isManual: boolean = true) => {
    setIsAnalyzing(isManual);
    if (isManual) {
      setAnalysis(null);
      setSelectedEvent(null);
    }
    
    const steps = [
      "INITIALIZING ASI-EVOLVE RESEARCHER AGENT...",
      "QUERYING COGNITION STORE FOR PRIOR LESSONS...",
      "VECTORIZING CURRENT TACTICAL STREAMS...",
      "RUNNING MARITIME/AERIAL CROSS-CORRELATION...",
      "SIMULATING ASI-EVOLVE FEEDBACK LOOP...",
      "CRYSTALLIZING PREDICTIVE OUTCOME..."
    ];

    if (isManual) {
      for (const step of steps) {
        setAnalysisStatus(step);
        addLog(step);
        await new Promise(r => setTimeout(r, 800)); // Simulate agent work
      }
    } else {
      addLog("ASI-EVOLVE: BACKGROUND RECONNAISSANCE COMMENCED.");
    }
    
    try {
      const response = await fetch(`${API_BASE}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intelligenceData: selectedEvent || events })
      });
      const result = await response.json();
      
      setAnalysis({
        ...result,
        timestamp: new Date().toISOString()
      });

      if (result.new_lesson) {
        addLog(`CRITICAL: NEW COGNITION ACQUIRED - ${result.new_lesson.title}`);
        const resCog = await fetch(`${API_BASE}/api/cognition`);
        const cogData = await resCog.json();
        setCognition(cogData);
      }

      if (!isManual && result.threat_score > 40) {
        setAlerts(prev => [{
          id: Date.now().toString(),
          msg: result.summary,
          score: result.threat_score
        }, ...prev].slice(0, 5));
        addLog(`[ALERT] SUSPICIOUS ACTIVITY DETECTED [${result.threat_score}%]`);
      }

      addLog(isManual ? "ANALYSIS COMPLETE: THREAT MAPPED." : "BACKGROUND SCAN COMPLETE: NO IMMEDIATE THREAT DETECTED.");
    } catch (err) {
      addLog("AI ANALYSIS ERROR: CONNECTION INTERRUPTED.");
    } finally {
      setIsAnalyzing(false);
      setAnalysisStatus("");
    }
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
    const interval = setInterval(fetchIntel, 60000); // Poll every minute
    return () => clearInterval(interval);
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
    return <Auth onSuccess={() => setDemoAccess(true)} />;
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
            <h1 className="font-bold tracking-tighter text-lg leading-none">OPHANIM-V1</h1>
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

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <AnimatePresence mode="wait">
            {activeTab === "streams" && (
              <motion.div 
                key="streams"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col gap-1"
              >
                {events.map((event) => (
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
          <div className="flex items-center gap-1"><Wifi className="w-3 h-3" /> LINK: STABLE</div>
          <button onClick={fetchIntel} className="hover:text-[var(--color-brand-primary)] flex items-center gap-1">
            <RefreshCw className="w-4 h-4" /> SYNC
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
            events={events} 
            selectedEvent={selectedEvent} 
            onEventClick={setSelectedEvent} 
          />
        </div>
        
        {/* Bottom Panel - Analysis Trigger */}
        <div className="h-12 border-t hud-border hud-bg flex items-center px-4 justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="flex items-center gap-2 bg-[var(--color-brand-primary)] text-black px-4 py-1 font-bold hover:bg-white hover:text-black transition-colors disabled:opacity-50"
            >
              {isAnalyzing ? <Cpu className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
              {isAnalyzing ? "PROCESSING EVOLUTION..." : "IN-DEPTH ASI-EVOLVE REVIEW"}
            </button>
            <button 
              onClick={() => setAutoAnalysisActive(!autoAnalysisActive)}
              className={cn(
                "text-[10px] px-2 py-1 border transition-colors",
                autoAnalysisActive ? "border-[var(--color-brand-primary)] text-[var(--color-brand-primary)]" : "border-gray-600 text-gray-600"
              )}
            >
              AUTO-MONITOR: {autoAnalysisActive ? "ON" : "OFF"}
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
                <section>
                  <div className="text-[10px] opacity-60 mb-1">IDENTIFIER: {selectedEvent.id}</div>
                  <div className="text-xl font-bold tracking-tight mb-2 border-b-2 border-[var(--color-brand-primary)] pb-1">
                    {selectedEvent.label}
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
                    <Cpu className="w-4 h-4" />
                    <span>ASI-EVOLVE INFERENCE ENGINE</span>
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
