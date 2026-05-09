export default async function handler(req, res) {
  try {
    const KEY = process.env.AISSTREAM_API_KEY;

    if (!KEY) {
      console.log("AISStream: No API key found");
      return res.status(200).json({ 
        vessels: [], 
        message: "AISSTREAM_API_KEY not configured" 
      });
    }

    // MENA-focused bounding box (you can adjust)
    const boundingBox = [
      [10.0, 30.0],   // South-West
      [35.0, 65.0]    // North-East
    ];

    const response = await fetch("https://aisstream.io/api/ships", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": KEY,
      },
      body: JSON.stringify({
        boundingBoxes: [boundingBox],
        // Optional: filter by ship types (e.g., tankers, cargo)
        // shipTypes: [70, 80, 82, 83],
      }),
    });

    if (!response.ok) {
      console.error(`AISStream returned status: ${response.status}`);
      return res.status(200).json({ 
        vessels: [], 
        message: `AISStream error: ${response.status}` 
      });
    }

    const data = await response.json();

    console.log(`AISStream: ${data.length || 0} vessels received`);

    res.status(200).json({
      vessels: data || [],
      count: data?.length || 0,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('AISStream Error:', err.message);
    res.status(200).json({ 
      vessels: [], 
      error: err.message 
    });
  }
}
