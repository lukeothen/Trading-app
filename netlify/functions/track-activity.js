const { randomUUID } = require("crypto");

exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
  const respond = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;

  // Health check only. Never allow a public GET request to write to the database.
  if (event.httpMethod === "GET") {
    let projectHost = null;
    try { projectHost = SUPABASE_URL ? new URL(SUPABASE_URL).host : null; } catch (_) {}
    return respond(200, {
      function: "track-activity",
      configured: Boolean(SUPABASE_URL && SUPABASE_SECRET_KEY),
      projectHost
    });
  }
  if (event.httpMethod !== "POST") return respond(405, { error: "Method not allowed" });
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) return respond(503, { error: "Activity tracking is not configured" });

  try {
    let body;
    try { body = JSON.parse(event.body || "{}"); }
    catch (_) { return respond(400, { error: "Invalid JSON" }); }

    const allowedEvents = new Set([
      "feature_opened","calculation_completed","ai_used",
      "job_saved","estimate_saved","feedback_submitted"
    ]);
    const allowedFeatures = new Set([
      "home","fence","jobs","settings","materials","gate-calculator",
      "cutting-calculator","netting-calculator","ai-mate","site-checklist","estimate",
      "talk","how","gates","cutting","netting","checklist"
    ]);
    if (!body || !allowedEvents.has(body.event_type)) return respond(400, { error: "Invalid activity event" });

    const incoming = body.details && typeof body.details === "object" && !Array.isArray(body.details) ? body.details : {};
    const details = {};
    if (typeof incoming.feature === "string" && allowedFeatures.has(incoming.feature)) details.feature = incoming.feature;
    if (typeof incoming.outcome === "string" && /^(success|failure)$/.test(incoming.outcome)) details.outcome = incoming.outcome;

    const baseUrl = new URL(SUPABASE_URL).origin;
    const response = await fetch(baseUrl + "/rest/v1/fence_mate_activity", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_SECRET_KEY,
        "Authorization": "Bearer " + SUPABASE_SECRET_KEY,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({ tester_id: randomUUID(), event_name: body.event_type, event_type: body.event_type, details })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Supabase activity insert failed", response.status, errorText.slice(0, 500));
      return respond(502, { error: "Could not save activity", upstreamStatus: response.status });
    }
    return respond(200, { success: true });
  } catch (error) {
    console.error("Activity tracking failed", error && error.message ? error.message : "unknown error");
    return respond(500, { error: "Activity tracking is unavailable" });
  }
};
