export default async function handler(req, res) {
  try {
    const API_KEY = process.env.AVIATIONSTACK_API_KEY;

    if (!API_KEY) {
      console.log("AviationStack: No API key found");
      return res.status(200).json({ 
        data: [], 
        message: "AviationStack key not configured" 
      });
    }

    const response = await fetch(
      `https://api.aviationstack.com/v1/flights?access_key=${API_KEY}&limit=30&flight_status=active`
    );

    if (response.status === 401) {
      console.log("AviationStack: Invalid or missing API key");
      return res.status(200).json({ 
        data: [], 
        message: "AviationStack authentication failed" 
      });
    }

    if (!response.ok) {
      throw new Error(`Status: ${response.status}`);
    }

    const data = await response.json();

    res.status(200).json({
      success: true,
      data: data.data || [],
      count: data.data?.length || 0
    });

  } catch (err) {
    console.error('AviationStack Error:', err.message);
    res.status(200).json({ 
      success: false, 
      data: [] 
    });
  }
}
