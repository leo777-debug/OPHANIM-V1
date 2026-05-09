export default async function handler(req, res) {
  try {
    // ADSB.fi - real flights over MENA, no key needed!
    const resp = await fetch('https://opendata.adsb.fi/api/v2/lat/25/lon/45/dist/800', {
      headers: { 'User-Agent': 'OPHANIM-V1/1.0' }
    });
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.json({ ac: [] });
  }
}
