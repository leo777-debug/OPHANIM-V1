import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { IntelligenceEvent } from "../types";

interface TimeMachineProps {
  onHistoricalData: (events: IntelligenceEvent[] | null) => void;
  isLive: boolean;
  setIsLive: (live: boolean) => void;
}

export default function TimeMachine({ onHistoricalData, isLive, setIsLive }: TimeMachineProps) {
  const WINDOW_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const [value, setValue] = useState(now);
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState("🔴 LIVE");

  const fetchHistorical = useCallback(async (timestamp: number) => {
    setLoading(true);
    const from = new Date(timestamp - 2 * 60 * 1000).toISOString();
    const to   = new Date(timestamp + 2 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('event_history')
      .select('*')
      .gte('recorded_at', from)
      .lte('recorded_at', to)
      .limit(200);

    if (error || !data || data.length === 0) {
      onHistoricalData([]);
      setLoading(false);
      return;
    }

    const events: IntelligenceEvent[] = data.map((row: any) => ({
      id:        row.asset_id,
      type:      row.asset_type,
      lat:       row.lat,
      lng:       row.lng,
      label:     row.label || row.asset_id,
      intensity: row.intensity || 0.5,
      details:   row.details || '',
      timestamp: row.recorded_at,
    }));

    onHistoricalData(events);
    setLoading(false);
  }, [onHistoricalData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ts = Number(e.target.value);
    setValue(ts);
    const live = ts >= now - 90000;
    setIsLive(live);
    if (live) {
      setLabel("🔴 LIVE");
      onHistoricalData(null);
    } else {
      const d = new Date(ts);
      setLabel(d.toUTCString().slice(0, 25));
      fetchHistorical(ts);
    }
  };

  const goLive = () => {
    setValue(now);
    setIsLive(true);
    setLabel("🔴 LIVE");
    onHistoricalData(null);
  };

  return (
    <div style={{
      position: 'absolute', bottom: 56, left: '5%', right: '5%',
      background: 'rgba(10,22,40,0.95)', border: '1px solid #1a3a5c',
      borderRadius: 6, padding: '10px 16px', zIndex: 1000,
      display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'monospace'
    }}>
      <span style={{ fontSize: 10, color: '#00C2D4', fontWeight: 'bold', minWidth: 180, letterSpacing: 1 }}>
        ⏱ {loading ? 'LOADING...' : label}
      </span>
      <input
        type="range"
        min={now - WINDOW_MS}
        max={now}
        step={60000}
        value={value}
        onChange={handleChange}
        style={{ flex: 1, accentColor: '#00C2D4' }}
      />
      <span style={{ fontSize: 9, color: '#4a7a9b', minWidth: 60 }}>-24h</span>
      <button onClick={goLive} style={{
        background: isLive ? '#00C2D4' : 'transparent',
        color: isLive ? '#000' : '#00C2D4',
        border: '1px solid #00C2D4', borderRadius: 3,
        padding: '4px 10px', fontSize: 10, fontWeight: 'bold',
        cursor: 'pointer', fontFamily: 'monospace', letterSpacing: 1
      }}>
        LIVE
      </button>
    </div>
  );
}
