const { GoogleGenAI } = require("@google/genai");

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  };
  const respond = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
  if (event.httpMethod !== "POST") return respond(405, { error: "Method not allowed" });
  if (!process.env.GEMINI_API_KEY) return respond(503, { error: "AI service is not configured" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch (_) { return respond(400, { error: "Invalid JSON" }); }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return respond(400, { error: "Enter a question first" });
  if (message.length > 4000) return respond(413, { error: "Question is too long (maximum 4,000 characters)" });

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        "You are Fence Mate, a practical UK fencing trade assistant. Help with fencing materials, measurements, quantities and simple maths. State units clearly, show assumptions, and flag estimates that need site/product verification. Never present a guess as a confirmed building regulation or supplier specification. For safety-critical, structural, boundary, legal or planning matters, recommend checking the relevant professional/authority. If information is missing, ask a concise clarifying question. Do not claim you have inspected a site or supplier catalogue.\n\nUser question: ",
        message
      ].join("")
    });
    const reply = typeof response.text === "string" ? response.text.trim() : "";
    if (!reply) return respond(502, { error: "AI returned an empty answer" });
    return respond(200, { reply });
  } catch (error) {
    console.error("AI request failed", error && error.message ? error.message : "unknown error");
    return respond(502, { error: "AI service is temporarily unavailable. Please try again shortly." });
  }
};
