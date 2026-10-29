exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  };
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anonKey) {
    return { statusCode: 503, headers, body: JSON.stringify({ error: "Account service is not configured" }) };
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") throw new Error("Invalid Supabase URL");
    return { statusCode: 200, headers, body: JSON.stringify({ url: parsed.origin, anonKey }) };
  } catch (_) {
    return { statusCode: 503, headers, body: JSON.stringify({ error: "Account service configuration is invalid" }) };
  }
};
