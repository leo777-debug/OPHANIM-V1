export default async function handler(req, res) {
  try {
    const KEY = process.env.N2YO_API_KEY;
    // Get ALL satellites above MENA center (25°N, 45°E), 60 degree radius
    const resp = await fetch(`https://api.n2yo.com/rest/v1/satellite/above/25/45/0/60/0/&apiKey=${KEY}`);
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.json({ above: [] });
  }
}
