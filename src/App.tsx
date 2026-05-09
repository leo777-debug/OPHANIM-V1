import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Activity, Shield, Cpu, RefreshCw, Plane, Ship, Orbit } from "lucide-react";

const API_BASE = (import.meta as any).env.VITE_API_URL || "";

export default function App() {
  const [logs, setLogs] = useState(["OPHANIM-V1 INITIALIZED"]);
  const addLog = (msg) => setLogs(prev => [msg, ...prev].slice(0, 10));

  const fetchIntel = async () => {
    addLog("Fetching data...");
    // Add your fetches later
  };

  return (
    <div className="flex h-screen w-screen bg-black text-[#00ff41] font-mono overflow-hidden">
      <div className="flex-1 flex items-center justify-center flex-col">
        <Shield className="w-16 h-16 mb-4" />
        <h1 className="text-3xl font-bold tracking-tighter">OPHANIM-ATLAS</h1>
        <p className="text-sm opacity-60 mt-2">MENA Geospatial Intelligence Platform</p>
        
        <button 
          onClick={fetchIntel}
          className="mt-8 px-6 py-3 border border-[#00ff41] hover:bg-[#00ff41] hover:text-black transition-colors"
        >
          <RefreshCw className="inline mr-2" /> START FUSION
        </button>

        <div className="mt-12 text-xs opacity-50 max-w-md text-center">
          If you see this screen, the app is running.<br />
          Check the console (F12) for any errors.
        </div>
      </div>
    </div>
  );
}
