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

  // AVS pricing and stock can vary by account, branch, VAT basis and delivery.
  // Open AVS's site search rather than guessing a product or inventing a price.
  // AVS uses a Magento-style catalogue search route; search.php?search_query was incorrect.
  const searchUrl = "https://www.avsfencing.co.uk/catalogsearch/result/?q=" + encodeURIComponent(query);
  return respond(200, {
    products: [],
    searchUrl,
    message: "AVS search is ready. Choose the exact product and verify its current price, VAT and delivery, then enter the unit price manually."
  });
};
