export default async function handler(req, res) {
  try {
    const resp = await fetch('https://api.gdeltproject.org/api/v2/geo/geo?query=conflict+OR+attack+OR+explosion+OR+missile&TIMESPAN=1440&MAXROWS=25&OUTPUTTYPE=2&FORMAT=GeoJSON');
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
