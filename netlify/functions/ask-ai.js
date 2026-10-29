exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  };
  const respond = (statusCode, body) => ({
    statusCode,
    headers,
    body: JSON.stringify(body)
  });

  if (event.httpMethod !== "POST") {
    return respond(405, { error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return respond(503, {
      error: "ChatGPT is not configured yet. Add OPENAI_API_KEY in Netlify environment variables."
    });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (_) {
    return respond(400, { error: "Invalid request body" });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return respond(400, { error: "Enter a question first" });
  if (message.length > 4000) {
    return respond(413, { error: "Question is too long (maximum 4,000 characters)" });
  }

  try {
    const apiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.5",
        instructions: [
          "You are FENCE MATE AI Mate, a practical UK fencing trade assistant.",
          "Help with fencing materials, measurements, quantities, estimating and simple maths.",
          "State units clearly, show calculations and assumptions, and ask a concise question if essential details are missing.",
          "Do not invent supplier prices, stock availability, site observations, product specifications or legal/building-regulation requirements.",
          "Flag estimates that need checking against actual site conditions and product specifications.",
          "For safety-critical, structural, boundary, legal or planning matters, recommend checking the relevant professional or authority.",
          "Keep answers clear, practical and easy to read on a phone."
        ].join(" "),
        input: message,
        store: false
      })
    });

    const data = await apiResponse.json().catch(() => ({}));
    if (!apiResponse.ok) {
      console.error("OpenAI request failed with status", apiResponse.status);
      if (apiResponse.status === 401) {
        return respond(502, { error: "ChatGPT API key was rejected. Check OPENAI_API_KEY in Netlify." });
      }
      if (apiResponse.status === 429) {
        return respond(502, { error: "ChatGPT API quota or rate limit reached. Check your OpenAI API billing and limits." });
      }
      return respond(502, { error: "ChatGPT could not answer just now. Please try again shortly." });
    }

    const reply = (data.output || [])
      .filter(item => item && item.type === "message")
      .flatMap(item => Array.isArray(item.content) ? item.content : [])
      .filter(item => item && item.type === "output_text" && typeof item.text === "string")
      .map(item => item.text)
      .join("\n")
      .trim();

    if (!reply) {
      console.error("OpenAI returned no output text");
      return respond(502, { error: "ChatGPT returned an empty answer. Please try again." });
    }

    return respond(200, { reply });
  } catch (error) {
    console.error("ChatGPT request failed", error && error.message ? error.message : "unknown error");
    return respond(502, { error: "ChatGPT is temporarily unavailable. Please try again shortly." });
  }
};
