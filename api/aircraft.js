export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  try {
    const user = process.env.OPENSKY_USER || '';
    const pass = process.env.OPENSKY_PASS || '';
    const headers = {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'application/json',
    };
    if (user) {
      headers['Authorization'] = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
    }
    const resp = await fetch(
      'https://opensky-network.org/api/states/all?lamin=10&lomin=25&lamax=45&lomax=65',
      { headers }
    );
    if (!resp.ok) {
      console.error('OpenSky error:', resp.status);
      return res.json({ ac: [] });
    }
    const data = await resp.json();
    const ac = (data.states || [])
      .filter((s) => s[6] && s[5])
      .map((s) => ({
        hex: s[0],
        flight: s[1]?.trim() || '',
        lat: s[6],
        lon: s[5],
        alt_baro: s[7],
        gs: s[9],
        squawk: s[14] || '',
        t: ''
      }));
    res.json({ ac });
  } catch (err) {
    console.error('Aircraft fetch error:', err.message);
    res.json({ ac: [] });
  }
}
