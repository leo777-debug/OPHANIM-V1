export default async function handler(req, res) {
  const { lat = 25, lng = 45, zoom = 6, date } = req.query;
  const today = date || new Date().toISOString().split('T')[0];
  
  // GIBS MODIS Terra True Color - best for anomaly detection
  const imageUrl = `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=MODIS_Terra_CorrectedReflectance_TrueColor&FORMAT=image/jpeg&WIDTH=512&HEIGHT=512&CRS=CRS:84&BBOX=${lng-10},${lat-10},${lng+10},${lat+10}&TIME=${today}`;
  
  res.json({ imageUrl, date: today, lat, lng });
}
