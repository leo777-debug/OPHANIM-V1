export default async function handler(req, res) {
  try {
    const resp = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson');
    const data = await resp.json();
    // Filter ONLY MENA region earthquakes
    if (data.features) {
      data.features = data.features.filter((f) => {
        const [lng, lat] = f.geometry.coordinates;
        return lat >= 10 && lat <= 45 && lng >= 25 && lng <= 65;
      });
    }
    res.json(data);
  } catch (err) {
    res.json({ features: [] });
  }
}
