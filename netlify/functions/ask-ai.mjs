import { GoogleGenAI } from "@google/genai";

export default async (req) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };

  const respond = (status, body) =>
    new Response(JSON.stringify(body), { status, headers });

  if (req.method !== "POST") {
    return respond(405, { error: "Method not allowed." });
  }

  try {
    let input;

    try {
      input = JSON.parse((await req.text()) || "{}");
    } catch {
      return respond(400, { error: "Please enter a valid question." });
    }

    const message = input.message;

    if (
      typeof message !== "string" ||
      !message.trim() ||
      message.length > 4000
    ) {
      return respond(400, {
        error: "Enter a question of up to 4000 characters.",
      });
    }

    const ai = new GoogleGenAI({});
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    let data;
    try {
      data = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: [{ role: "user", parts: [{ text: message.trim() }] }],
        config: {
          systemInstruction: [
                    "You are TradeMate AI, a practical UK fencing site assistant.",
                    "Help with measurements, post spacing, bays, panels, rails, pales, materials, estimates and job planning.",
                    "Use British English and metric units.",
                    "Give the direct answer first, then explain the calculation in simple steps.",
                    "Use plain text headings and bullet points. Do not use Markdown headings, bold markers, LaTeX, dollar signs for equations, or raw mathematical markup.",
                    "Write calculations in readable form, for example: 10 m ÷ 2 m = 5 bays.",
                    "For a straight run with equal bays, explain that the number of posts is normally one more than the number of bays, before allowing for corners, gates or changes of direction.",
                    "State assumptions clearly. Ask a short clarifying question if essential measurements are missing.",
                    "For material estimates, show quantities separately and explain what may change the total.",
                    "Never invent site measurements, prices, product specifications or guarantee structural safety.",
                    "Keep answers practical, clear and suitable for someone working on a fencing job."
                  ].join(" "),
          temperature: 0.3,
          maxOutputTokens: 1200,
          abortSignal: controller.signal,
          httpOptions: { timeout: 20000 },
        },
      });
    } catch (error) {
      if (controller.signal.aborted || error.name === "AbortError") {
        return respond(504, {
          error: "The AI took too long to respond. Please try again."
        });
      }
      if (error.status === 429 || error.status === 503) {
        return respond(503, {
          error: "The AI service is busy right now. Please try again shortly."
        });
      }
      return respond(502, {
        error: "The AI could not answer that question. Please try again."
      });
    } finally {
      clearTimeout(timeout);
    }

    const answer = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();

    if (!answer) {
      return respond(502, {
        error: "The AI returned no answer. Please try again."
      });
    }

    return respond(200, { reply: answer });
  } catch (error) {
    console.error("TradeMate AI function failed.");

    if (error.name === "AbortError") {
      return respond(504, {
        error: "The AI took too long to respond. Please try again."
      });
    }

    return respond(500, {
      error: "Something went wrong. Please try again."
    });
  }
};
