import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs/promises";
import cors from "cors";
import helmet from "helmet";
import { z } from "zod";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Input Schemas
const IntelligenceDataSchema = z.array(z.object({
  id: z.string(),
  type: z.enum(['vessel', 'aircraft', 'conflict', 'news', 'satellite']),
  lat: z.number(),
  lng: z.number(),
  label: z.string(),
  intensity: z.number(),
  details: z.string(),
  timestamp: z.string()
})).or(z.object({
  id: z.string(),
  type: z.enum(['vessel', 'aircraft', 'conflict', 'news', 'satellite']),
  lat: z.number(),
  lng: z.number(),
  label: z.string(),
  intensity: z.number(),
  details: z.string(),
  timestamp: z.string()
}));

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Security Headers
  app.use(helmet({
    contentSecurityPolicy: false, // Disable for Vite dev
  }));
  
  app.use(cors());
  app.use(express.json({ limit: "50kb" }));

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

  // News Proxy
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

  // ASI-Evolve Simulation Endpoint
  app.post("/api/analyze", async (req, res) => {
    const validated = IntelligenceDataSchema.safeParse(req.body.intelligenceData);
    if (!validated.success) {
      return res.status(400).json({ error: "INVALID_PAYLOAD", details: validated.error.format() });
    }
    const intelligenceData = validated.data;
    
    try {
      // 1. LEARN: Fetch context from Cognition Store
      const cognitionRaw = await fs.readFile(COGNITION_PATH, "utf-8");
      const cognition = JSON.parse(cognitionRaw);

      // 2. DESIGN & EXPERIMENT
      const prompt = `
        ${SYSTEM_PROMPT}
        
        COGNITION STORE (Prior Lessons):
        ${JSON.stringify(cognition, null, 2)}
        
        CURRENT INTEL STREAMS:
        ${JSON.stringify(intelligenceData, null, 2)}
        
        TASK:
        Evaluate the current intel using your expertise and the prior lessons.
        If a new tactical pattern is found, output it in 'new_lesson'.
      `;

      let resultText = "";
      if (process.env.DEEPSEEK_API_KEY) {
        // Use DeepSeek if available
        const dsResp = await fetch("https://api.deepseek.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [{ role: "user", content: prompt }]
          })
        });
        const dsJson = await dsResp.json();
        resultText = dsJson.choices[0].message.content;
      } else {
        // Fallback to Gemini
        const result = await model.generateContent(prompt);
        resultText = (await result.response).text();
      }

      let analysis;
      try {
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch (e) {
        analysis = null;
      }

      // Ensure valid structure for frontend
      const finalizedAnalysis = {
        threat_score: analysis?.threat_score ?? 0,
        evidence: Array.isArray(analysis?.evidence) ? analysis.evidence : ["Signal complexity elevated", "Pattern verification required"],
        recommendation: analysis?.recommendation || "CONTINUE MONITORING STREAMS",
        summary: analysis?.summary || "Tactical assessment completed with limited markers.",
        new_lesson: analysis?.new_lesson || null
      };

      // 4. ANALYZE & EVOLVE: Store new lesson if generated
      if (finalizedAnalysis.new_lesson) {
        cognition.push({
          id: `evolved-${Date.now()}`,
          ...finalizedAnalysis.new_lesson
        });
        if (cognition.length > 50) cognition.shift();
        await fs.writeFile(COGNITION_PATH, JSON.stringify(cognition, null, 2));
      }

      res.json(finalizedAnalysis);
    } catch (error) {
      console.error("ASI-Evolve Execution Error:", error);
      res.status(500).json({ error: "Evolution loop failed" });
    }
  });

  app.get("/api/cognition", async (req, res) => {
    try {
      const data = await fs.readFile(COGNITION_PATH, "utf-8");
      res.json(JSON.parse(data));
    } catch (err) {
      res.status(500).json({ error: "Failed to read cognition" });
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
