export default async function handler(req, res) {
  const KEY = process.env.NASA_API_KEY;
  const resp = await fetch(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${KEY}/VIIRS_SNPP_NRT/world/1`);
  const text = await resp.text();
  res.setHeader('Content-Type', 'text/plain');
  res.send(text);
}
