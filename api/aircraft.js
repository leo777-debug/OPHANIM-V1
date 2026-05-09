export default async function handler(req, res) {
  try {
    // Try ADSB.fi with different endpoint
    const resp = await fetch('https://opendata.adsb.fi/api/v2/lat/25/lon/45/dist/800', {
      headers: { 
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      }
    });
    const data = await resp.json();
    
    // If empty try alternative
    if (!data.ac || data.ac.length === 0) {
      const resp2 = await fetch('https://api.adsb.one/v2/point/25/45/800', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const data2 = await resp2.json();
      return res.json(data2);
    }
    
    res.json(data);
  } catch (err) {
    res.json({ ac: [] });
  }
}
