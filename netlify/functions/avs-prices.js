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
  const clean = (value) => String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;|&#160;/gi, " ").replace(/&pound;/gi, "£")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ").trim();

  try {
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FenceMateMaterialSearch/1.0)",
        "Accept": "text/html,application/xhtml+xml"
      },
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) {
      return respond(200, { products: [], searchUrl, message: "AVS returned HTTP " + response.status + ". Open the AVS search link and enter the verified price manually." });
    }
    const html = await response.text();
    if (/captcha|access denied|verify you are human|cloudflare/i.test(html.slice(0, 12000))) {
      return respond(200, { products: [], searchUrl, message: "AVS blocked automatic catalogue access. Open the AVS search link to check the product and enter its verified price manually." });
    }

    // Parse only AVS product cards. Never manufacture a product or a price.
    const blocks = html.match(/<li\b[^>]*class=["'][^"']*product-item[^"']*["'][\s\S]*?<\/li>/gi) || [];
    const products = [];
    const seen = new Set();
    for (const block of blocks) {
      const linkMatch = block.match(/<a\b[^>]*class=["'][^"']*product-item-link[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i)
        || block.match(/<a\b[^>]*href=["']([^"']+\.html(?:\?[^"']*)?)["'][^>]*>([\s\S]*?)<\/a>/i);
      if (!linkMatch) continue;
      let url;
      try { url = new URL(linkMatch[1].replace(/&amp;/g, "&"), "https://www.avsfencing.co.uk"); } catch (_) { continue; }
      if (url.hostname !== "www.avsfencing.co.uk" && url.hostname !== "avsfencing.co.uk") continue;
      const name = clean(linkMatch[2]) || clean(block.match(/alt=["']([^"']+)["']/i)?.[1]);
      if (!name || seen.has(url.href)) continue;
      const sku = clean(block.match(/(?:SKU|sku)\s*:?\s*([A-Z0-9-]{4,})/i)?.[1]);
      const priceValues = [...block.matchAll(/data-price-amount=["']([0-9]+(?:\.[0-9]{1,2})?)["']/gi)].map(m => Number(m[1]));
      const visiblePrices = [...block.matchAll(/£\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/g)].map(m => Number(m[1].replace(/,/g, "")));
      const prices = [...new Set((priceValues.length ? priceValues : visiblePrices).filter(n => Number.isFinite(n) && n > 0))].slice(0, 4);
      // AVS may put the real thumbnail in a lazy-load attribute while src contains a placeholder.
      // Prefer the real lazy-load URL, then fall back to src/srcset.
      let imageUrl;
      const imgTag = block.match(/<img\b[^>]*>/i)?.[0] || "";
      const attrValue = (attr) => {
        const m = imgTag.match(new RegExp("\\b" + attr + "\\s*=\\s*[\\"']([^\\"']+)[\\"']", "i"));
        return m ? m[1] : "";
      };
      const rawImage = attrValue("data-src") || attrValue("data-original") || attrValue("data-lazy-src") || attrValue("src") || attrValue("srcset").split(",")[0].trim().split(/\s+/)[0];
      if (rawImage) {
        try {
          const parsedImage = new URL(rawImage.replace(/&amp;/g, "&"), "https://www.avsfencing.co.uk");
          if ((parsedImage.hostname === "www.avsfencing.co.uk" || parsedImage.hostname === "avsfencing.co.uk") && /\.(?:jpe?g|png|webp|avif)(?:$|\?)/i.test(parsedImage.pathname + parsedImage.search)) imageUrl = parsedImage.href;
        } catch (_) {}
      }
      seen.add(url.href);
      products.push({
        name: name.slice(0, 180),
        url: url.href,
        imageUrl,
        sku: sku || undefined,
        prices,
        publicPrice: prices.length ? prices[0] : null
      });
      if (products.length >= 8) break;
    }

    // Some AVS search cards omit image URLs entirely. Fall back to the official product page.
    await Promise.all(products.filter(p => !p.imageUrl).slice(0, 2).map(async (product) => {
      try {
        const pageResponse = await fetch(product.url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; FenceMateMaterialSearch/1.0)", "Accept": "text/html,application/xhtml+xml" },
          signal: AbortSignal.timeout(2000)
        });
        if (!pageResponse.ok) return;
        const page = await pageResponse.text();
        const meta = page.match(/<meta[^>]+property=["\x27]og:image["\x27][^>]+content=["\x27]([^"\x27]+)["\x27][^>]*>/i) || page.match(/<meta[^>]+content=["\x27]([^"\x27]+)["\x27][^>]+property=["\x27]og:image["\x27][^>]*>/i);
        const photoTag = page.match(/<img[^>]+class=["\x27][^"\x27]*product-image-photo[^>]*>/i) || page.match(/<img[^>]+src=["\x27][^"\x27]+\.(?:jpg|jpeg|png|webp|avif)(?:\?[^"\x27]*)?["\x27][^>]*>/i);
        const photoAttr = photoTag ? (photoTag[0].match(/(?:src|data-src|data-original)=["\x27]([^"\x27]+)["\x27]/i) || [])[1] : "";
        const rawImage = (meta && meta[1]) || photoAttr;
        if (!rawImage) return;
        const parsedImage = new URL(rawImage.replace(/&amp;/g, "&"), "https://www.avsfencing.co.uk");
        if ((parsedImage.hostname === "www.avsfencing.co.uk" || parsedImage.hostname === "avsfencing.co.uk") && /\.(?:jpe?g|png|webp|avif)(?:$|\?)/i.test(parsedImage.pathname + parsedImage.search)) product.imageUrl = parsedImage.href;
      } catch (_) {}
    }));
    return respond(200, {
      products,
      searchUrl,
      message: products.length
        ? "Found AVS catalogue matches. Check the product dimensions and whether the displayed price includes VAT before using it in your estimate."
        : "AVS did not return readable product cards for this search. Open the AVS search link and enter the verified unit price manually."
    });
  } catch (error) {
    return respond(200, {
      products: [],
      searchUrl,
      message: "Automatic AVS lookup could not connect (" + (error && error.name === "TimeoutError" ? "timed out" : "connection failed") + "). Open the AVS search link and enter the verified unit price manually."
    });
  }
};
