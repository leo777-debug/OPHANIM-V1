export default async function handler(req, res) {
  try {
    // all_hour = every earthquake globally past hour, no minimum magnitude!
    const resp = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson');
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.json({ features: [] });
  }
}
