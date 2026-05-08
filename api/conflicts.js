export default async function handler(req, res) {
  // GDELT - real conflict/event data updated every 15 minutes!
  const resp = await fetch('https://api.gdeltproject.org/api/v2/geo/geo?query=conflict+OR+attack+OR+explosion+OR+missile&TIMESPAN=1440&MAXROWS=25&OUTPUTTYPE=2&FORMAT=JSON');
  const data = await resp.json();
  res.json(data);
}
