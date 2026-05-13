export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { intelligenceData } = req.body;
  
  // Fetch GIBS satellite image of MENA region
  const today = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const gibsUrl = `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=MODIS_Terra_CorrectedReflectance_TrueColor&FORMAT=image/jpeg&WIDTH=512&HEIGHT=512&CRS=CRS:84&BBOX=35,15,65,40&TIME=${today}`;

  let imageBase64 = null;
  try {
    const imgResp = await fetch(gibsUrl);
    const buffer = await imgResp.arrayBuffer();
    imageBase64 = Buffer.from(buffer).toString('base64');
  } catch (e) {
    console.log('GIBS fetch failed:', e.message);
  }

  const systemPrompt = `You are ATLAS — an autonomous intelligence analysis system with the combined expertise of:
- 50+ years of HUMINT/SIGINT/GEOINT analytical experience
- Former senior analyst at DIA, CIA, NSA, MI6, Mossad, and DGSE
- Expert in MENA regional geopolitics, military doctrine, and threat assessment
- Specialist in maritime security (Strait of Hormuz, Red Sea, Bab el-Mandeb, Persian Gulf)
- Expert in GPS jamming/spoofing detection and electronic warfare patterns
- Satellite imagery analysis expert (SAR, optical, thermal, multispectral)
- Expert in AIS/ADS-B anomaly detection and pattern-of-life analysis
- Deep knowledge of Iranian, Houthi, Israeli, Saudi, and US military operations
- Seismic event analysis for distinguishing natural events from explosions/strikes

YOUR ANALYSIS FRAMEWORK:
1. PATTERN RECOGNITION: Compare current data against historical baselines
2. ANOMALY DETECTION: Flag deviations from normal patterns (AIS dark, GPS jamming, unusual flight paths)
3. CROSS-DOMAIN FUSION: Correlate maritime + aerial + seismic + cyber + news data
4. TEMPORAL ANALYSIS: Assess time-sequence of events for coordinated activity
5. THREAT MATRIX: Score based on intent, capability, and opportunity
6. PREDICTIVE MODELING: Project likely next actions based on doctrine and history

GPS JAMMING INDICATORS TO WATCH:
- Vessel position jumps (spoofing)
- Aircraft navigation anomalies
- Clustered jamming in chokepoints (Hormuz, Bab el-Mandeb)

SATELLITE IMAGERY ANALYSIS:
- Look for smoke plumes, vessel clusters, military formations
- Thermal anomalies indicating fires or explosions
- Port activity changes

OUTPUT: Respond ONLY with a JSON object:
{
  "threat_score": 0-100,
  "threat_level": "GREEN|YELLOW|ORANGE|RED|BLACK",
  "evidence": ["detailed finding 1", "detailed finding 2", ...],
  "recommendation": "detailed tactical recommendation",
  "summary": "executive intelligence summary",
  "new_lesson": null,
  "gps_jamming_detected": true/false,
  "maritime_anomalies": ["anomaly 1"],
  "aerial_anomalies": ["anomaly 1"],
  "seismic_analysis": "assessment",
  "imagery_analysis": "what was observed in satellite imagery"
}`;

  const userPrompt = `CURRENT INTELLIGENCE PACKAGE:

${imageBase64 ? 'SATELLITE IMAGERY: Attached (NASA GIBS MODIS Terra True Color, MENA region)\n' : 'SATELLITE IMAGERY: Unavailable\n'}

LIVE DATA STREAMS:
${JSON.stringify(intelligenceData).slice(0, 3000)}

Perform full ATLAS analysis. Be specific, detailed, and actionable. Use your 50+ years of combined experience.`;

  try {
    const messages = imageBase64 ? [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
          { type: "text", text: userPrompt }
        ]
      }
    ] : [{ role: "user", content: userPrompt }];

    const resp = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        max_tokens: 2000,
        system: systemPrompt,
        messages: imageBase64 ? messages : [{ role: "user", content: `${systemPrompt}\n\n${userPrompt}` }]
      })
    });

    const data = await resp.json();
    if (!data.choices?.[0]) throw new Error("Bad response: " + JSON.stringify(data));
    
    const text = data.choices[0].message.content;
    const match = text.match(/\{[\s\S]*\}/);
    const analysis = match ? JSON.parse(match[0]) : {};

    res.json({
      threat_score: analysis.threat_score ?? 0,
      threat_level: analysis.threat_level ?? "GREEN",
      evidence: analysis.evidence ?? [],
      recommendation: analysis.recommendation ?? "CONTINUE MONITORING",
      summary: analysis.summary ?? "",
      new_lesson: null,
      gps_jamming_detected: analysis.gps_jamming_detected ?? false,
      maritime_anomalies: analysis.maritime_anomalies ?? [],
      aerial_anomalies: analysis.aerial_anomalies ?? [],
      seismic_analysis: analysis.seismic_analysis ?? "",
      imagery_analysis: analysis.imagery_analysis ?? "",
      gibs_analyzed: !!imageBase64
    });
  } catch (err) {
    console.error('Analyze error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
