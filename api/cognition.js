res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Cache-Control', 'no-store');
export default async function handler(req, res) {
  res.json([]);
}
