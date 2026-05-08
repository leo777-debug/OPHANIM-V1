import React, { useState } from "react";
import { motion } from "motion/react";
import { Shield, Lock, UserPlus, Eye, ScanSearch, Radio, Database } from "lucide-react";
import { supabase } from "../lib/supabase";

interface AuthProps {
  onSuccess: () => void;
}

export default function Auth({ onSuccess }: AuthProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Safety transition in case of total failure
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
      onSuccess();
    }, 5000);

    try {
      // 1. Establish anonymous session FIRST for RLS/Auth tracking
      const { error: authError } = await supabase.auth.signInAnonymously();
      if (authError) {
        console.warn("Anonymous auth failed:", authError);
      }

      // 2. Record data in Supabase table
      const { error: insertError } = await supabase.from('operators').insert([{ name, email }]);
      if (insertError) {
        console.error("Supabase insert failed:", insertError);
        // We log it but don't strictly block unless we want to ensure sync
        // setError(`DATABASE_SYNC_ERROR: ${insertError.message}`);
      } else {
        console.log("Operator record saved successfully");
      }

      clearTimeout(safetyTimeout);
      setLoading(false);
      onSuccess();
    } catch (err: any) {
      console.error("Initialization error:", err);
      // Fallback: Proceed to demo anyway
      clearTimeout(safetyTimeout);
      setLoading(false);
      onSuccess();
    }
  };

  return (
    <div className="min-h-screen bg-black text-[#00ff41] font-mono flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="scanline" />
      
      {/* Landing Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full grid md:grid-cols-2 gap-12 items-center z-10"
      >
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <Shield className="w-12 h-12 animate-pulse" />
            <h1 className="text-4xl font-black tracking-tighter">OPHANIM-V1</h1>
          </div>
          
          <div className="space-y-4">
            <p className="text-xl font-bold leading-tight uppercase">
              The World's First Autonomous AI Intelligence Proxy.
            </p>
            <p className="opacity-70 text-sm leading-relaxed">
              OPHANIM-V1 is an agentic framework designed to close the loop between vast OSINT data streams and actionable intelligence. It doesn't just monitor—it predicts.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Feature icon={<Radio className="w-4 h-4" />} title="Live Fusion" desc="ADS-B, AIS, and EONET integration." />
            <Feature icon={<ScanSearch className="w-4 h-4" />} title="ASI-Evolve" desc="Self-correcting analytic logic." />
            <Feature icon={<Eye className="w-4 h-4" />} title="Predictive" desc="Anomalous behavior forecasting." />
            <Feature icon={<Database className="w-4 h-4" />} title="Cognition" desc="Persistent tactical memory." />
          </div>
        </div>

        {/* Auth Form */}
        <div className="hud-bg border-2 border-[#00ff41]/20 p-8 shadow-[0_0_50px_rgba(0,255,65,0.1)] relative">
          <div className="absolute -top-3 -left-3 bg-[#00ff41] text-black px-2 py-1 text-[10px] font-bold">
            RECRUITMENT_TERMINAL
          </div>
          
          <div className="mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
               <UserPlus className="w-5 h-5" /> INITIALIZE_OPERATOR
            </h2>
            <p className="text-[10px] text-[#00ff41]/60 leading-tight uppercase">
              Give email and name and signup to try demo
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="text-[9px] opacity-70">FULL_NAME_ID</label>
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-black/50 border border-[#00ff41]/30 p-3 outline-none focus:border-[#00ff41] transition-colors text-sm"
                placeholder="OPERATOR NAME"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] opacity-70">COMMS_CHANNEL (EMAIL)</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/50 border border-[#00ff41]/30 p-3 outline-none focus:border-[#00ff41] transition-colors text-sm"
                placeholder="operator@ophanim.intel"
              />
            </div>

            {error && (
              <div className="text-red-500 text-[10px] uppercase font-bold animate-pulse">
                ERR: {error}
              </div>
            )}

            <button 
              disabled={loading}
              className="w-full bg-[#00ff41] text-black font-black py-4 px-6 hover:bg-white transition-all transform hover:scale-[1.02] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 text-sm tracking-widest"
            >
              {loading ? "ESTABLISHING..." : "TRY DEMO"}
            </button>
          </form>

          <div className="mt-8 text-center">
            <div className="text-[8px] opacity-30 tracking-[0.2em]">CONNECTED TDN-GATEWAY // [LATENCY: 12ms]</div>
          </div>
        </div>
      </motion.div>
      
      <div className="absolute bottom-4 text-[8px] opacity-20 tracking-widest">
        SYSTEM_ROOT: OPHANIM_CORE_V1.0.4 // ENCRYPTION: AES-256-GCM
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="hud-bg border border-[#00ff41]/10 p-3 space-y-1">
      <div className="flex items-center gap-2 text-[#00ff41]">
        {icon}
        <span className="text-[10px] font-bold">{title}</span>
      </div>
      <p className="text-[9px] opacity-50 leading-tight">{desc}</p>
    </div>
  );
}
