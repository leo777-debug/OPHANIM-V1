// app/api/aviation/route.js   ← Next.js App Router
// OR pages/api/aviation.js    ← Pages Router

export default async function handler(req, res) {
  try {
    const API_KEY = process.env.AVIATIONSTACK_API_KEY;

    if (!API_KEY) {
      return res.status(500).json({ error: "AVIATIONSTACK_API_KEY is not set" });
    }

    // Focus on MENA region + live flights
    const response = await fetch(
      `https://api.aviationstack.com/v1/flights?access_key=${API_KEY}&limit=50&flight_status=active`
    );

    if (!response.ok) {
      throw new Error(`AviationStack returned ${response.status}`);
    }

    const data = await response.json();

    console.log(`AviationStack: ${data.data?.length || 0} flights received`);

    res.status(200).json({
      success: true,
      data: data.data || [],
      timestamp: new Date().toISOString(),
      count: data.data?.length || 0
    });

  } catch (err) {
    console.error('AviationStack Error:', err.message);
    res.status(200).json({
      success: false,
      data: [],
      error: err.message
    });
  }
}
