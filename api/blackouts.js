// api/blackouts.js
export default async function handler(req, res) {
  try {
    const resp = await fetch('https://api.ioda.caida.org/v2/outages/alerts?from=-1d&until=now&limit=20');
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.json({ data: [] });
  }
}
