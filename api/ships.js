// app/api/ships/route.js   ← Recommended for App Router
// OR pages/api/ships.js    ← If using Pages Router

export default async function handler(req, res) {
  try {
    const API_KEY = process.env.AISSTREAM_API_KEY;

    if (!API_KEY) {
      return res.status(500).json({ 
        error: "AISSTREAM_API_KEY is not configured" 
      });
    }

    // Bounding Box for MENA focus (you can adjust)
    const boundingBox = [
      [10.0, 30.0],   // Bottom-left  (lat, lon)
      [35.0, 65.0]    // Top-right
    ];

    const response = await fetch("https://aisstream.io/api/ships", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": API_KEY,
      },
      body: JSON.stringify({
        boundingBoxes: [boundingBox],
        // Optional filters:
        // shipTypes: [70, 80, 82, 83], // Tankers, Cargo, etc.
        // minSpeed: 5,
        // maxSpeed: 30
      }),
    });

    if (!response.ok) {
      throw new Error(`AISStream returned ${response.status}`);
    }

    const data = await response.json();

    console.log(`AISStream: ${data.length || 0} vessels received`);

    res.status(200).json({
      vessels: data || [],
      timestamp: new Date().toISOString(),
      count: data?.length || 0
    });

  } catch (err) {
    console.error('AISStream Error:', err.message);
    res.status(200).json({ 
      vessels: [],
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
}
