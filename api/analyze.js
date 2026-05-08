export default async function handler(req, res) {
  const { intelligenceData } = req.body;
  const prompt = `You are a MENA intelligence analyst. Analyze this data and return JSON with threat_score, evidence array, recommendation, summary, new_lesson. Data: ${JSON.stringify(intelligenceData)}`;
  
  const resp = await fetch("https://api.deepseek.com/v1/chat/completions", {
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
  const data = await resp.json();
  const text = data.choices[0].message.content;
  const match = text.match(/\{[\s\S]*\}/);
  const analysis = match ? JSON.parse(match[0]) : {};
  res.json({
    threat_score: analysis.threat_score ?? 0,
    evidence: analysis.evidence ?? [],
    recommendation: analysis.recommendation ?? "CONTINUE MONITORING",
    summary: analysis.summary ?? "",
    new_lesson: analysis.new_lesson ?? null
  });
}
