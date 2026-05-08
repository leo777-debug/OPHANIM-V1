export default async function handler(req, res) {
  const KEY = process.env.NEWS_API_KEY;
  const response = await fetch(`https://newsapi.org/v2/everything?q=MENA+security+OR+maritime+OR+conflict&sortBy=publishedAt&pageSize=10&apiKey=${KEY}`);
  const data = await response.json();
  res.json(data);
}

