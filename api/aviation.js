export default async function handler(req, res) {
  const KEY = process.env.Aviationstack_API_KEY;
  const resp = await fetch(`http://api.aviationstack.com/v1/flights?access_key=${KEY}&limit=5`);
  const data = await resp.json();
  res.json(data);
}


