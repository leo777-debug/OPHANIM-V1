export default async function handler(req, res) {
  const KEY = process.env.AISSTREAM_API_KEY;
  res.json({ key: KEY ? 'connected' : 'missing', message: 'Use WebSocket for live AIS data' });
}
