
exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  };

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  try {
    const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;

    if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
      throw new Error("Server configuration is incomplete");
    }

    const body = JSON.parse(event.body || "{}");
    const allowedEvents = [
      "feature_opened",
      "calculation_completed",
      "ai_used",
      "job_saved",
      "estimate_saved",
      "feedback_submitted"
    ];

    if (
      !allowedEvents.includes(body.event_type) ||
      typeof body.details !== "object" ||
      body.details === null ||
      Array.isArray(body.details)
    ) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid activity event" })
      };
    }

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/fence_mate_activity`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_SECRET_KEY,
          "Authorization": `Bearer ${SUPABASE_SECRET_KEY}`,
          "Prefer": "return=minimal"
        },
        body: JSON.stringify({
          event_type: body.event_type,
          details: body.details
        })
      }
    );

    if (!response.ok) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: "Could not save activity"
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Activity tracking is unavailable"
      })
    };
  }
};
