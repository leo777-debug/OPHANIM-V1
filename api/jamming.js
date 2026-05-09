// api/jamming.js
export default async function handler(req, res) {
  try {
    const resp = await fetch('https://gpsjam.org/api/v1/jams?lat=25&lon=45&z=5');
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.json({ jams: [] });
  }
}
