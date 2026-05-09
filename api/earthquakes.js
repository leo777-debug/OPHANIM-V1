export default async function handler(req, res) {
  try {
    // all_hour = ALL earthquakes globally past hour, no minimum magnitude!
    // This picks up micro-quakes, explosions, missile impacts
    const resp = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson');
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    // Fallback to day feed
    try {
      const resp2 = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson');
      const data2 = await resp2.json();
      res.json(data2);
    } catch (err2) {
      res.json({ features: [] });
    }
  }
}
