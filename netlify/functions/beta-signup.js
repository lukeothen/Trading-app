const { randomUUID } = require("crypto");

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  };
  const respond = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

  if (event.httpMethod !== "POST") {
    return respond(405, { error: "Method not allowed" });
  }

  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    return respond(503, { error: "Beta signups are not configured yet." });
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch (_) { return respond(400, { error: "Invalid request." }); }

  // Honeypot for simple bots; do not disclose whether it triggered.
  if (typeof body.company_website === "string" && body.company_website.trim()) {
    return respond(200, { message: "Thanks — your beta request has been received." });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = typeof body.role === "string" ? body.role.trim() : "";
  const allowedRoles = new Set([
    "Fencing contractor", "Landscaper / groundworker", "Builder / other trade",
    "Supplier", "Other"
  ]);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return respond(400, { error: "Enter a valid email address." });
  }
  if (!allowedRoles.has(role) || body.consent !== true) {
    return respond(400, { error: "Choose your role and confirm consent." });
  }

  let endpoint;
  try {
    endpoint = new URL("/rest/v1/fence_mate_beta_signups", new URL(SUPABASE_URL).origin);
  } catch (_) {
    return respond(503, { error: "Beta signup service is misconfigured." });
  }

  try {
    const upstream = await fetch(endpoint.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_SECRET_KEY,
        "Authorization": "Bearer " + SUPABASE_SECRET_KEY,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({
        id: randomUUID(),
        email,
        role,
        consent: true,
        consented_at: new Date().toISOString(),
        source: "fence_mate_beta_page"
      })
    });

    if (upstream.ok) {
      return respond(200, { message: "Thanks — your beta request has been received." });
    }
    // Do not return database details, credentials, or submitted data to the browser.
    if (upstream.status === 409) {
      return respond(200, { message: "Thanks — that email is already on the beta list." });
    }
    console.error("Beta signup insert failed", { status: upstream.status });
    return respond(502, { error: "We couldn't save your request just now. Please try again later." });
  } catch (error) {
    console.error("Beta signup request failed", { message: error.message });
    return respond(502, { error: "Beta signup is temporarily unavailable. Please try again later." });
  }
};