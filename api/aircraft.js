export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    // Use ADS-B Exchange which allows server-side fetching
    const resp = await fetch('https://api.adsb.one/v2/point/25/45/800', {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (compatible; OPHANIM/1.0)',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip'
      }
    });
    const text = await resp.text();
    // Check if HTML returned
    if (text.startsWith('<')) {
      return res.json({ ac: [] });
    }
    const data = JSON.parse(text);
    res.json(data);
  } catch (err) {
    res.json({ ac: [] });
  }
}
