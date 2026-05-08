export default async function handler(req, res) {
  res.json([]);
}

const requests = new Map();

export default async function handler(req, res) {
  const ip = req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const max = 30;

  if (!requests.has(ip)) requests.set(ip, []);
  const times = requests.get(ip).filter(t => now - t < windowMs);
  times.push(now);
  requests.set(ip, times);

  if (times.length > max) {
    return res.status(429).json({ error: 'RATE_LIMIT_EXCEEDED' });
  }

  const KEY = process.env.NEWS_API_KEY;
  const response = await fetch(`https://newsapi.org/v2/everything?q=MENA+security+OR+maritime+OR+conflict&sortBy=publishedAt&pageSize=10&apiKey=${KEY}`);
  const data = await response.json();
  res.json(data);
}
