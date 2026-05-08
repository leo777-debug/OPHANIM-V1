export default async function handler(req, res) {
  const resp = await fetch(`https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=5`);
  const data = await resp.json();
  res.json(data);
}
