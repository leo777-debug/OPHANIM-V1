res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Cache-Control', 'no-store');
export default async function handler(req, res) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const resp = await fetch(`https://gpsjam.org/api/v1/jams?date=${today}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const text = await resp.text();
    if (text.startsWith('<')) return res.json({ jams: [] });
    const data = JSON.parse(text);
    res.json(data);
  } catch (err) {
    res.json({ jams: [] });
  }
}
