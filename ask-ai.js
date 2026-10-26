exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Method not allowed" }) };
  }
  try {
    const { message } = JSON.parse(event.body || "{}");
    if (typeof message !== "string" || !message.trim() || message.length > 4000) {
      return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Enter a question of up to 4000 characters." }) };
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Gemini API key is not configured.");
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: "You are TradeMate AI, a practical UK fencing site assistant. Help with fence measurements, post spacing, materials, estimating and job planning. Show working for calculations, use metric units, state assumptions, and flag safety-critical uncertainties. Do not invent site measurements or guarantee structural safety." }] },
        contents: [{ role: "user", parts: [{ text: message.trim() }] }]
      })
    });
    const data = await response.json();
    if (!response.ok) {
      console.error("Gemini API error:", response.status, data);
      return { statusCode: 502, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "The AI service could not answer. Please try again." }) };
    }
    const answer = data.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("").trim();
    if (!answer) return { statusCode: 502, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "The AI returned no answer. Please try again." }) };
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reply: answer }) };
  } catch (error) {
    console.error("TradeMate AI function failed:", error.message);
    return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Something went wrong. Please try again." }) };
  }
};
