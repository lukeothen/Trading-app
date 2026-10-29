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

  // Use native fetch with a hard deadline so this function returns a useful
  // response before Netlify's gateway times out.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);
  try {
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=" + encodeURIComponent(apiKey);
    const googleResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: "You are Fence Mate, a practical UK fencing trade assistant. Help with fencing materials, measurements, quantities and simple maths. State units clearly, show assumptions, and flag estimates that need site/product verification. Never present a guess as a confirmed building regulation or supplier specification. For safety-critical, structural, boundary, legal or planning matters, recommend checking the relevant professional/authority. If information is missing, ask a concise clarifying question. Do not claim you have inspected a site or supplier catalogue.\n\nUser question: " + message
          }]
        }],
        generationConfig: { maxOutputTokens: 256, temperature: 0.2 }
      })
    });
    const result = await googleResponse.json().catch(() => ({}));
    if (!googleResponse.ok) {
      const status = googleResponse.status;
      console.error("Gemini API error", JSON.stringify({ status, message: result.error && result.error.message ? result.error.message : "No error details" }));
      if (status === 400 || status === 404) return respond(502, { error: "Google could not use the configured Gemini model or request. Check the Netlify function logs." });
      if (status === 401 || status === 403) return respond(502, { error: "Google rejected the Gemini API key or its permissions. Check the key and Gemini API access." });
      if (status === 429) return respond(503, { error: "Gemini API quota or rate limit reached. Check Google AI Studio usage and billing." });
      return respond(502, { error: "Gemini returned an error (HTTP " + status + "). Check Netlify function logs." });
    }
    const reply = result.candidates && result.candidates[0] && result.candidates[0].content && Array.isArray(result.candidates[0].content.parts)
      ? result.candidates[0].content.parts.map(part => typeof part.text === "string" ? part.text : "").join("").trim()
      : "";
    if (!reply) return respond(502, { error: "Gemini returned an empty answer. Check Netlify function logs for the response details." });
    return respond(200, { reply });
  } catch (error) {
    if (error && error.name === "AbortError") {
      console.error("Gemini request exceeded 6500ms timeout");
      return respond(504, { error: "Google AI took too long to respond. Please try again shortly." });
    }
    console.error("AI request failed", JSON.stringify({ message: error && error.message ? error.message : "unknown error" }));
    return respond(502, { error: "Fence Mate could not reach Google AI. Check the Netlify function logs." });
  } finally {
    clearTimeout(timeout);
  }
};
