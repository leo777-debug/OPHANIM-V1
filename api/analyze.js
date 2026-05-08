export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { intelligenceData } = req.body;
  const prompt = `You are a MENA intelligence analyst. Analyze this data and return ONLY a JSON object with: threat_score (0-100), evidence (array of strings), recommendation (string), summary (string), new_lesson (null). Data: ${JSON.stringify(intelligenceData).slice(0, 2000)}`;
  
  try {
    const resp = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}` },
      body: JSON.stringify({ model: "deepseek-chat", messages: [{ role: "user", content: prompt }] })
    });
    const data = await resp.json();
    if (!data.choices?.[0]) throw new Error("Bad response: " + JSON.stringify(data));
    const text = data.choices[0].message.content;
    const match = text.match(/\{[\s\S]*\}/);
    const analysis = match ? JSON.parse(match[0]) : {};
    res.json({
      threat_score: analysis.threat_score ?? 0,
      evidence: analysis.evidence ?? [],
      recommendation: analysis.recommendation ?? "CONTINUE MONITORING",
      summary: analysis.summary ?? "",
      new_lesson: null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

const requests = new Map();

export default async function handler(req, res) {
  const ip = req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const max = 30;

  if (!requests.has(ip)) requests.set(ip, []);
  const times = requests.get(ip).filter(t => now - t < windowMs);
  times.push(now);
  requests.set(ip, times);

  if (times.length > max) {
    return res.status(429).json({ error: 'RATE_LIMIT_EXCEEDED' });
  }

  const KEY = process.env.NEWS_API_KEY;
  const response = await fetch(`https://newsapi.org/v2/everything?q=MENA+security+OR+maritime+OR+conflict&sortBy=publishedAt&pageSize=10&apiKey=${KEY}`);
  const data = await response.json();
  res.json(data);
}
