exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
  const respond = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
  if (event.httpMethod !== "POST") return respond(405, { error: "Method not allowed" });

  try {
    const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
    if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) return respond(503, { error: "Activity tracking is not configured" });

    let body;
    try { body = JSON.parse(event.body || "{}"); }
    catch { return respond(400, { error: "Invalid JSON" }); }

    const allowedEvents = new Set(["feature_opened","calculation_completed","ai_used","job_saved","estimate_saved","feedback_submitted"]);
    if (!body || !allowedEvents.has(body.event_type)) return respond(400, { error: "Invalid activity event" });

    const incoming = body.details && typeof body.details === "object" && !Array.isArray(body.details) ? body.details : {};
    const details = {};
    if (typeof incoming.feature === "string" && /^[a-z-]{1,30}$/.test(incoming.feature)) details.feature = incoming.feature;
    if (typeof incoming.outcome === "string" && /^(success|failure)$/.test(incoming.outcome)) details.outcome = incoming.outcome;

    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/fence_mate_activity`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_SECRET_KEY, "Authorization": `Bearer ${SUPABASE_SECRET_KEY}`, "Prefer": "return=minimal" },
      body: JSON.stringify({ event_type: body.event_type, details })
    });
    if (!response.ok) return respond(502, { error: "Could not save activity" });
    return respond(200, { success: true });
  } catch (_) {
    return respond(500, { error: "Activity tracking is unavailable" });
  }
};
