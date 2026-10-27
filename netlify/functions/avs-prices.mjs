const BASE = "https://www.avsfencing.co.uk";
const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
const respond = (status, body) => new Response(JSON.stringify(body), { status, headers });

function decodeEntities(value = "") {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&#163;|&pound;/g, "£")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}
function plainText(html = "") {
  return decodeEntities(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ").trim();
}
function extractProducts(html) {
  const products = [];
  const linkRe = /<a\b([^>]*class=["'][^"']*product-item-link[^"']*["'][^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = linkRe.exec(html)) && products.length < 12) {
    const attrs = match[1];
    const href = (attrs.match(/href=["']([^"']+)["']/i) || [])[1];
    const name = plainText(match[2]);
    if (!href || !name) continue;
    const start = Math.max(0, match.index - 4500);
    const end = Math.min(html.length, linkRe.lastIndex + 4500);
    const block = html.slice(start, end);
    const sku = (block.match(/SKU\s*:?\s*([A-Z0-9-]{5,})/i) || [])[1] || "";
    const prices = [];
    const priceRe = /data-price-amount=["']([0-9]+(?:\.[0-9]{1,2})?)["']/gi;
    let pm;
    while ((pm = priceRe.exec(block)) && prices.length < 4) {
      const value = Number(pm[1]);
      if (value > 0 && !prices.includes(value)) prices.push(value);
    }
    if (!prices.length) {
      const text = plainText(block);
      const re = /£\s*([0-9,]+\.\d{2})/g;
      let p;
      while ((p = re.exec(text)) && prices.length < 4) {
        const value = Number(p[1].replace(/,/g, ""));
        if (value > 0 && !prices.includes(value)) prices.push(value);
      }
    }
    const url = href.startsWith("http") ? href : new URL(href, BASE).href;
    if (!products.some(p => p.url === url)) products.push({ name, url, sku, prices });
  }
  return products;
}

export default async (req) => {
  if (req.method !== "POST") return respond(405, { error: "Method not allowed." });
  let input;
  try { input = await req.json(); } catch { return respond(400, { error: "Send a material search term." }); }
  const query = typeof input.query === "string" ? input.query.trim().slice(0, 120) : "";
  if (query.length < 2) return respond(400, { error: "Enter a material name to search AVS." });
  const searchUrl = `${BASE}/catalogsearch/result/?q=${encodeURIComponent(query)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(searchUrl, {
      headers: { "User-Agent": "FenceMatePriceLookup/1.0 (public product lookup)", "Accept": "text/html,application/xhtml+xml" },
      signal: controller.signal,
      redirect: "follow"
    });
    if (!response.ok) return respond(502, { error: `AVS search returned HTTP ${response.status}.`, searchUrl });
    const html = await response.text();
    const products = extractProducts(html);
    return respond(200, {
      query,
      source: "AVS public website search",
      searchUrl,
      fetchedAt: new Date().toISOString(),
      products: products.map(p => ({ ...p, publicPrice: p.prices[0] ?? null })),
      message: products.length ? "Check the exact size/specification and which displayed price includes VAT before applying a price." : "No products could be reliably extracted. Open the AVS search page and check the product manually."
    });
  } catch (error) {
    return respond(502, { error: error.name === "AbortError" ? "AVS took too long to respond." : "Could not retrieve AVS public prices right now.", searchUrl });
  } finally { clearTimeout(timer); }
};
