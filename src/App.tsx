import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Activity, AlertTriangle, Layers, Shield, Cpu, Terminal, Crosshair,
  Globe, Newspaper, Database, BrainCircuit, RefreshCw, Search,
  Plane, Ship, Orbit, Zap, Flame, Radio
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
  const [demoAccess, setDemoAccess] = useState(() => localStorage.getItem("ophanim_demo_access") === "true");
  const [activeTab, setActiveTab] = useState<"streams" | "news" | "cognition">("streams");

  const [layers, setLayers] = useState<MapLayers>({
    aircraft: true, vessel: true, satellite: true, news: true,
    seismic: true, conflict: true, fire: true,
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

  const addLog = (msg: string) => setLogs(prev => [msg, ...prev].slice(0, 50));

  // ================== IMPROVED FETCHINTEL ==================
  const fetchIntel = async () => {
    addLog("POLLING ALL DATA STREAMS...");

    try {
      const responses = await Promise.allSettled([
        fetch(`${API_BASE}/api/news`),
        fetch(`${API_BASE}/api/cognition`),
        fetch(`${API_BASE}/api/nasa`),
        fetch(`${API_BASE}/api/aviation`),
        fetch(`${API_BASE}/api/aircraft`),
        fetch(`${API_BASE}/api/earthquakes`),
        fetch(`${API_BASE}/api/conflicts`),
        fetch(`${API_BASE}/api/firms`),
        fetch(`${API_BASE}/api/satellites`),
      ]);

      const [newsData,
