export default async function handler(req, res) {
  try {
    // ADS-B Exchange free API - no key needed!
    const resp = await fetch('https://api.adsb.one/v2/point/25/45/800', {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json',
        'Referer': 'https://www.adsbexchange.com'
      }
    });
    const text = await resp.text();
    if (text.startsWith('<')) return res.json({ ac: [] });
    const data = JSON.parse(text);
    res.json(data);
  } catch (err) {
    res.json({ ac: [] });
  }
}
