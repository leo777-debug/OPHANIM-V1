res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Cache-Control', 'no-store');
export default async function handler(req, res) {
  try {
    const KEY = process.env.N2YO_API_KEY;
    // Category 52 = Starlink, category 20 = GPS, category 30 = Military
    const resp = await fetch(`https://api.n2yo.com/rest/v1/satellite/above/25/45/0/70/52/&apiKey=${KEY}`);
    const data = await resp.json();
    console.log('N2YO response:', JSON.stringify(data));
    res.json(data);
  } catch (err) {
    console.error('N2YO error:', err.message);
    res.json({ above: [] });
  }
}
