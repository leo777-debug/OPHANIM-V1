export default async function handler(req, res) {
  try {
    const resp = await fetch('https://opensky-network.org/api/states/all?lamin=10&lomin=25&lamax=45&lomax=65');
    if (!resp.ok) throw new Error('OpenSky returned ' + resp.status);
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
