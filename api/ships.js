res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Cache-Control', 'no-store');
export default async function handler(req, res) {
  try {
    const resp = await fetch('https://www.vesselfinder.com/api/pub/vesselsonmap?bbox=25,10,65,30&zoom=7&show_names=1', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://www.vesselfinder.com',
        'Accept': 'application/json'
      }
    });
    const text = await resp.text();
    if (text.startsWith('<')) return res.json([]);
    const data = JSON.parse(text);
    res.json(data);
  } catch (err) {
    res.json([]);
  }
}
