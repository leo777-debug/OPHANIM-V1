res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Cache-Control', 'no-store');
export default async function handler(req, res) {
  try {
    // IODA - Internet Outage Detection and Analysis, no key needed!
    const from = Math.floor(Date.now() / 1000) - 86400; // last 24h
    const until = Math.floor(Date.now() / 1000);
    const resp = await fetch(`https://api.ioda.caida.org/v2/outages/alerts?from=${from}&until=${until}&limit=20`, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    });
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.json({ data: [] });
  }
}
