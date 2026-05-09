export default async function handler(req, res) {
  try {
    const user = process.env.OPENSKY_USER;
    const pass = process.env.OPENSKY_PASS;
    const auth = Buffer.from(`${user}:${pass}`).toString('base64');
    const resp = await fetch(
      'https://opensky-network.org/api/states/all?lamin=10&lomin=25&lamax=45&lomax=65',
      { headers: { 'Authorization': `Basic ${auth}` } }
    );
    const data = await resp.json();
    // Convert to ac format
    const ac = (data.states || []).map((s: any) => ({
      hex: s[0], flight: s[1]?.trim(),
      lat: s[6], lon: s[5],
      alt_baro: s[7], gs: s[9],
      t: '', squawk: s[14]
    })).filter((a: any) => a.lat && a.lon);
    res.json({ ac });
  } catch (err) {
    res.json({ ac: [] });
  }
}
