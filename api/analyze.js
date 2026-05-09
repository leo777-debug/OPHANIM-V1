export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { intelligenceData } = req.body;
  
  // Fetch GIBS satellite image of MENA region
  const today = new Date().toISOString().split('T')[0];
  const gibsUrl = `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=MODIS_Terra_CorrectedReflectance_TrueColor&FORMAT=image/jpeg&WIDTH=512&HEIGHT=512&CRS=CRS:84&BBOX=35,15,65,40&TIME=${today}`;

  let imageBase64 = null;
  try {
    const imgResp = await fetch(gibsUrl);
    const buffer = await imgResp.arrayBuffer();
    imageBase64 = Buffer.from(buffer).toString('base64');
  } catch (e) {
    console.log('GIBS fetch failed:', e.message);
  }

  const prompt = `You are a MENA intelligence analyst with satellite imagery analysis expertise.

Analyze BOTH the satellite imagery AND the intelligence data below.

Look for in the image:
- Unusual smoke plumes or fire signatures
- Military vehicle or ship clusters
- Explosion aftermath dark scorch marks
- Unusual port activity
- Convoy movements
- Anything anomalous in the Persian Gulf, Red Sea, Strait of Hormuz

Intelligence data: ${JSON.stringify(intelligenceData).slice(0, 2000)}

Return ONLY a JSON object with: threat_score (0-100), evidence (array of strings), recommendation (string), summary (string), new_lesson (null).`;

  try {
    const messages = imageBase64 ? [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
          },
          { type: "text", text: prompt }
        ]
      }
    ] : [{ role: "user", content: prompt }];

    const resp = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        max_tokens: 1000,
        messages
      })
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
      new_lesson: null,
      gibs_analyzed: !!imageBase64
    });
  } catch (err) {
    console.error('Analyze error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
