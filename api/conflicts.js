export default async function handler(req, res) {
  try {
    const resp = await fetch('https://api.gdeltproject.org/api/v2/geo/geo?query=attack+OR+explosion+OR+airstrike&TIMESPAN=1440&MAXROWS=20&OUTPUTTYPE=2&FORMAT=GeoJSON', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const text = await resp.text();
    const data = JSON.parse(text);
    res.json(data);
  } catch (err) {
    res.json({ features: [] }); // return empty instead of crash
  }
}
