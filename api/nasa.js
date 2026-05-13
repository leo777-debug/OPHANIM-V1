res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Cache-Control', 'no-store');
export default async function handler(req, res) {
  try {
    const resp = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=10');
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.json({ events: [] });
  }
}
