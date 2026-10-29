const { GoogleGenAI } = require("@google/genai");

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  };
  const respond = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
  if (event.httpMethod !== "POST") return respond(405, { error: "Method not allowed" });
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return respond(503, { error: "AI key is not available to this Netlify function. Check the Production environment variable scope and redeploy the site." });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch (_) { return respond(400, { error: "Invalid JSON" }); }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return respond(400, { error: "Enter a question first" });
  if (message.length > 4000) return respond(413, { error: "Question is too long (maximum 4,000 characters)" });

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [
        "You are Fence Mate, a practical UK fencing trade assistant. Help with fencing materials, measurements, quantities and simple maths. State units clearly, show assumptions, and flag estimates that need site/product verification. Never present a guess as a confirmed building regulation or supplier specification. For safety-critical, structural, boundary, legal or planning matters, recommend checking the relevant professional/authority. If information is missing, ask a concise clarifying question. Do not claim you have inspected a site or supplier catalogue.\n\nUser question: ",
        message
      ].join("")
    });
    const reply = typeof response.text === "string" ? response.text.trim() : "";
    if (!reply) return respond(502, { error: "AI returned an empty answer" });
    return respond(200, { reply });
  } catch (error) {
    const status = Number(error && (error.status || error.statusCode || (error.response && error.response.status))) || 0;
    console.error("AI request failed", JSON.stringify({ status, message: error && error.message ? error.message : "unknown error" }));
    if (status === 400 || status === 404) return respond(502, { error: "The configured Gemini model is unavailable for this API key. Check the model access in Google AI Studio." });
    if (status === 401 || status === 403) return respond(502, { error: "Google rejected the Gemini API key or its permissions. Check that the key is valid and the Gemini API is enabled." });
    if (status === 429) return respond(503, { error: "Gemini API quota or rate limit reached. Check your Google AI Studio usage and billing limits." });
    return respond(502, { error: "Gemini could not complete the request. Check the Netlify function logs for the Google API error and try again." });
  }
};
