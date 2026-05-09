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
    if (!data.choices?.[0]) throw new Error("Bad DeepSeek response: " + JSON.stringify(data));
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
