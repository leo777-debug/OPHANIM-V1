export default async function handler(req, res) {
  const resp = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson');
  const data = await resp.json();
  res.json(data);
}
