// Simplified orbital propagator for UI visualization
// Based on circular orbit approximation
export function getSatellitePosition(timestamp: Date, inclination: number, raan: number, alt: number) {
  const G = 3.986004418e14; // Earth's gravitational constant
  const R = 6371000; // Earth's radius (m)
  const a = R + alt * 1000;
  const T = 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / G); // Orbital period
  
  const timeSec = timestamp.getTime() / 1000;
  const meanAnomaly = (2 * Math.PI * timeSec / T) % (2 * Math.PI);
  
  // Simplified conversion to lat/lng
  const lat = inclination * Math.sin(meanAnomaly);
  const lng = ((raan + (meanAnomaly * 180 / Math.PI)) % 360) - 180;
  
  return { lat, lng };
}
