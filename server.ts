import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs/promises";
import cors from "cors";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const COGNITION_PATH = path.join(process.cwd(), "cognition.json");

  const SYSTEM_PROMPT = `
You are a senior MENA intelligence analyst with 20+ years experience.
You are extremely detail-oriented. Analyze every single anomaly no matter how small:
- Aircraft deviations, loitering, unusual altitude/speed
- Ships turning off AIS, clustering, route deviations
- Conflict events near infrastructure
- News tone escalation
- Internet outages, weather impact, etc.

Region focus: Strait of Hormuz, Red Sea, Persian Gulf, Bab el-Mandeb.

Output in JSON with:
- threat_score (0-100)
- evidence (list of strings summarizing anomalies)
- recommendation (string)
- summary (short tactical summary)
- new_lesson (object with {title, lesson, context} or null)
`;

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // OpenSky Proxy (Aviation ADS-B)
  app.get("/api/live/aviation", async (req, res) => {
    try {
      // Bounding box for MENA region roughly: lat 10-45, lng 30-75
      const url = "https://opensky-network.org/api/states/all?lamin=10&lomin=30&lamax=45&lomax=75";
      const resp = await fetch(url);
      const data = await resp.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "OpenSky fetch failed" });
    }
  });

  // IODA Proxy (Internet Outages)
  app.get("/api/live/outages", async (req, res) => {
    try {
      // Fetch outage signals for regional countries
      const countries = ['IR', 'IQ', 'SY', 'YE', 'LB']; 
      const code = countries[Math.floor(Math.random() * countries.length)];
      const url = `https://api.ioda.inetintel.cc/v2/signals/raw/country/${code}?from=${Math.floor(Date.now()/1000) - 86400}`;
      const resp = await fetch(url);
      const data = await resp.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "IODA fetch failed" });
    }
  });

  // Celestrak Proxy (Satellite TLEs)
  app.get("/api/live/satellites", async (req, res) => {
    try {
      // Fetch active satellites
      const url = "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json";
      const resp = await fetch(url);
      const data = await resp.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "Celestrak fetch failed" });
    }
  });

  // NOTAMs Proxy (Airspace Closures - approximate via FAA public feed or similar)
  app.get("/api/live/notams", async (req, res) => {
    try {
      // This is a simplified proxy to a public resource
      const resp = await fetch("https://notams.aim.faa.gov/notamSearch/nsapp.html", { headers: { 'User-Agent': 'Mozilla/5.0' } });
      res.json({ status: "Public portal available. Real-time API requires SWIM registration." });
    } catch (err) {
      res.status(500).json({ error: "NOTAM access failed" });
    }
  });

  // AIS Maritime Proxy (Simplified heuristic or public aggregator if found)
  app.get("/api/live/maritime", async (req, res) => {
    try {
      // Real AIS is hard without keys. We'll proxy to a public-facing WMS/WFS if available or return a warning.
      res.json({ message: "SATELLITE_AIS_RESTRICTED: USING_STATION_HEURISTICS" });
    } catch (err) {
      res.status(500).json({ error: "Maritime fetch failed" });
    }
  });

  // News Proxy (Alternative Public RSS/JSON if key missing)
  app.get("/api/news", async (req, res) => {
    const NEWS_API_KEY = process.env.NEWS_API_KEY;
    if (!NEWS_API_KEY) return res.status(500).json({ error: "NEWS_API_KEY missing" });
    
    try {
      const response = await fetch(`https://newsapi.org/v2/everything?q=MENA+security+OR+maritime+OR+conflict&sortBy=publishedAt&pageSize=10&apiKey=${NEWS_API_KEY}`);
      const data = await response.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  // Aviation Stack Proxy
  app.get("/api/aviation", async (req, res) => {
    const KEY = process.env.AVIATION_STACK_API_KEY;
    if (!KEY) return res.status(500).json({ error: "AVIATION_STACK_API_KEY missing" });
    try {
      // Example: Search for flights in the region (simplified)
      const resp = await fetch(`http://api.aviationstack.com/v1/flights?access_key=${KEY}&limit=5`);
      const data = await resp.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "Aviation fecth failed" });
    }
  });

  // NASA EONET Proxy (Events)
  app.get("/api/nasa", async (req, res) => {
    const KEY = process.env.NASA_API_KEY;
    // NASA EONET doesn't strictly need a key for public events but we show we have it
    try {
      const resp = await fetch(`https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=5`);
      const data = await resp.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "NASA fetch failed" });
    }
  });

  // ASI-Evolve Simulation Endpoint is now handled on frontend for Vision support
  // The server remains as a data proxy for Cognition and external APIs.

  app.get("/api/cognition", async (req, res) => {
    try {
      const data = await fs.readFile(COGNITION_PATH, "utf-8");
      res.json(JSON.parse(data));
    } catch (err) {
      res.status(500).json({ error: "Failed to read cognition" });
    }
  });

  app.post("/api/cognition", async (req, res) => {
    try {
      const { lesson } = req.body;
      const data = await fs.readFile(COGNITION_PATH, "utf-8");
      const cognition = JSON.parse(data);
      cognition.push({
        id: `evolved-${Date.now()}`,
        ...lesson
      });
      if (cognition.length > 50) cognition.shift();
      await fs.writeFile(COGNITION_PATH, JSON.stringify(cognition, null, 2));
      res.json({ status: "ok" });
    } catch (err) {
      res.status(500).json({ error: "Failed to update cognition" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
