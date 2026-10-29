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

  const searchUrl = "https://www.avsfencing.co.uk/catalogsearch/result/?q=" + encodeURIComponent(query);
  const decode = (value) => String(value || "")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#x2F;/gi, "/")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const attr = (html, name) => {
    const re = new RegExp("\\b" + name + "\\s*=\\s*(['"])(.*?)\\1", "i");
    const match = html.match(re);
    return match ? decode(match[2]) : "";
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8500);
    let response;
    try {
      response = await fetch(searchUrl, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "en-GB,en;q=0.9",
          "User-Agent": "Mozilla/5.0 (compatible; FenceMate/1.0; product search)"
        }
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return respond(200, {
        products: [], searchUrl,
        message: "AVS did not allow the catalogue request (HTTP " + response.status + "). Open the official search and verify the price manually."
      });
    }

    const html = await response.text();
    const blocks = html.match(/<li\b[^>]*class=["'][^"']*product-item[^"']*["'][\s\S]*?<\/li>/gi) || [];
    const products = [];
    const seen = new Set();

    for (const block of blocks) {
      const linkMatch = block.match(/<a\b[^>]*class=["'][^"']*product-item-link[^"']*["'][^>]*>[\s\S]*?<\/a>/i)
        || block.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*class=["'][^"']*product-item-link[^"']*["'][^>]*>[\s\S]*?<\/a>/i);
      let url = "";
      let name = "";
      if (linkMatch) {
        const tag = linkMatch[0];
        url = attr(tag, "href");
        name = decode(tag.replace(/^[\s\S]*?>/, "").replace(/<\/a>\s*$/i, ""));
      }
      if (!name || !url) continue;
      if (url.startsWith("/")) url = "https://www.avsfencing.co.uk" + url;
      if (!/^https:\/\/www\.avsfencing\.co\.uk\//i.test(url) || seen.has(url)) continue;
      seen.add(url);

      const imageTag = block.match(/<img\b[^>]*>/i)?.[0] || "";
      let imageUrl = attr(imageTag, "src") || attr(imageTag, "data-src") || attr(imageTag, "data-original");
      if (imageUrl.startsWith("//")) imageUrl = "https:" + imageUrl;
      if (imageUrl.startsWith("/")) imageUrl = "https://www.avsfencing.co.uk" + imageUrl;
      if (imageUrl && !/^https:\/\/www\.avsfencing\.co\.uk\//i.test(imageUrl)) imageUrl = "";

      const priceMatch = block.match(/data-price-amount=["']([\d,.]+)["']/i)
        || block.match(/class=["'][^"']*price[^"']*["'][^>]*>[\s\S]*?£\s*([\d,.]+)/i)
        || block.match(/£\s*([\d,]+\.\d{2})/);
      const priceText = priceMatch ? (priceMatch[1] || priceMatch[2] || "") : "";
      const priceNumber = Number(String(priceText).replace(/,/g, ""));
      const skuMatch = block.match(/\bSKU\s*:\s*([A-Z0-9-]+)/i);
      products.push({
        name,
        url,
        imageUrl: imageUrl || null,
        sku: skuMatch ? skuMatch[1] : null,
        publicPrice: Number.isFinite(priceNumber) && priceNumber > 0 ? priceNumber : null,
        prices: Number.isFinite(priceNumber) && priceNumber > 0 ? [priceNumber] : []
      });
      if (products.length >= 8) break;
    }

    return respond(200, {
      products,
      searchUrl,
      message: products.length
        ? "AVS public listings found. Check the exact dimensions, treatment, VAT basis, stock and delivery before using a price."
        : "AVS opened the search request, but no product listings could be read automatically. Open the official search and enter the verified price manually."
    });
  } catch (_) {
    return respond(200, {
      products: [], searchUrl,
      message: "Automatic AVS lookup could not complete. Open the official AVS search and enter the verified price manually."
    });
  }
};
