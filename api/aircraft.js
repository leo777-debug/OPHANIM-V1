export default async function handler(req, res) {
  const resp = await fetch('https://opensky-network.org/api/states/all?lamin=10&lomin=25&lamax=45&lomax=65');
  const data = await resp.json();
  res.json(data);
}
