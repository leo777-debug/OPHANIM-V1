export default async function handler(req, res) {
  const resp = await fetch('https://www.gdacs.org/xml/rss.xml');
  const text = await resp.text();
  res.setHeader('Content-Type', 'application/xml');
  res.send(text);
}
