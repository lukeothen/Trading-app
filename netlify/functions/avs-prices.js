exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  };
  const respond = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
  if (event.httpMethod !== "POST") return respond(405, { error: "Method not allowed" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch (_) { return respond(400, { error: "Invalid JSON" }); }
  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (query.length < 2) return respond(400, { error: "Enter a material name" });
  if (query.length > 160) return respond(400, { error: "Material search is too long" });

  // AVS product pages may block automated scraping and prices can vary by account,
  // VAT basis and delivery. Never invent or scrape an unverified price. Send users
  // to a pre-filled public search and let them confirm the exact product and price.
  const searchUrl = "https://www.avsfencing.co.uk/catalogsearch/result/?q=" + encodeURIComponent(query);
  return respond(200, {
    products: [],
    searchUrl,
    message: "Automatic AVS catalogue lookup is not enabled in this stable beta. Open the official AVS search, confirm the exact product, current price, VAT and delivery, then enter the verified unit price manually."
  });
};
