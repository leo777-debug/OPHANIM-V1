export default async function handler(req, res) {
  const results = {};
  
  try {
    const r1 = await fetch('https://api.adsb.one/v2/point/25/45/800', { headers: { 'User-Agent': 'Mozilla/5.0' } });
    results.adsbOne = await r1.json();
  } catch(e) { results.adsbOne = { error: e.message }; }

  try {
    const r2 = await fetch('https://fr24api.flightradar24.com/api/live/flight-positions/light?bounds=45,10,25,65', { headers: { 'User-Agent': 'Mozilla/5.0' } });
    results.fr24 = await r2.json();
  } catch(e) { results.fr24 = { error: e.message }; }

  try {
    const r3 = await fetch('https://data.vrs.adengt.com/VirtualRadar/AircraftList.json?lat=25&lng=45&fDstL=0&fDstU=800', { headers: { 'User-Agent': 'Mozilla/5.0' } });
    results.vrs = await r3.json();
  } catch(e) { results.vrs = { error: e.message }; }

  res.json(results);
}
