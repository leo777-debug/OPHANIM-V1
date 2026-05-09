export default async function handler(req, res) {
  // OpenSky blocks serverless — return empty, AISStream handles real tracking
  res.json({ states: [] });
}
