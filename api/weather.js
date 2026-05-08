export default async function handler(req, res) {
  const KEY = process.env.OPENWEATHER_API_KEY;
  const resp = await fetch(`https://api.openweathermap.org/data/2.5/find?lat=25&lon=45&cnt=10&appid=${KEY}`);
  const data = await resp.json();
  res.json(data);
}
