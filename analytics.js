(() => {
  "use strict";

  const config = window.FENCE_MATE_SUPABASE_CONFIG || {};
  const url = typeof config.url === "string" ? config.url.trim() : "";
  const key = typeof config.publishableKey === "string" ? config.publishableKey.trim() : "";
  const CONSENT_KEY = "fencemate-analytics-consent";
  const SESSION_KEY = "fencemate-analytics-session";
  const allowedEvents = new Set([
    "app_open", "tool_open", "materials_calculated", "job_saved", "checklist_saved",
    "gate_calculated", "cuts_calculated", "netting_calculated", "ai_request_started",
    "ai_request_succeeded", "ai_request_failed", "avs_lookup_started",
    "avs_lookup_succeeded", "avs_lookup_failed", "estimate_saved", "quote_shared"
  ]);

  // No network requests or analytics UI unless a project URL and publishable key are configured.
  if (!url || !key || !window.supabase || typeof window.supabase.createClient !== "function") return;

  let client;
  try {
    client = window.supabase.createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
  } catch (_) {
    return;
  }

  function sessionId() {
    let id = "";
    try { id = localStorage.getItem(SESSION_KEY) || ""; } catch (_) {}
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      id = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === "x" ? r : (r & 3 | 8)).toString(16);
          });
      try { localStorage.setItem(SESSION_KEY, id); } catch (_) {}
    }
    return id;
  }

  async function track(eventName, properties = {}) {
    let consent = "";
    try { consent = localStorage.getItem(CONSENT_KEY) || ""; } catch (_) { return; }
    if (consent !== "accepted" || !allowedEvents.has(eventName)) return;
    // Only accept small, non-sensitive metadata. Never pass user-entered text, job data or AI prompts.
    const safe = {};
    if (properties && typeof properties.section === "string" &&
        /^[a-z-]{1,30}$/.test(properties.section)) safe.section = properties.section;
    if (properties && typeof properties.outcome === "string" &&
        /^(success|failure)$/.test(properties.outcome)) safe.outcome = properties.outcome;
    try {
      await client.from("app_events").insert({
        session_id: sessionId(),
        event_name: eventName,
        properties: safe
      });
    } catch (_) {
      // Analytics must never break Fence Mate.
    }
  }

  function consentBanner() {
    let consent = "";
    try { consent = localStorage.getItem(CONSENT_KEY) || ""; } catch (_) { return; }
    if (consent === "accepted") { track("app_open"); return; }
    if (consent === "declined") return;
    const banner = document.createElement("aside");
    banner.id = "fencemate-analytics-consent";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Optional anonymous usage analytics");
    banner.style.cssText = "position:fixed;z-index:9999;left:12px;right:12px;bottom:12px;max-width:620px;margin:auto;background:#202321;color:#fff;padding:16px;border-radius:14px;box-shadow:0 8px 32px #0004;font:14px/1.45 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif";
    const title = document.createElement("strong");
    title.textContent = "Help improve Fence Mate?";
    const copy = document.createElement("p");
    copy.textContent = "You can opt in to anonymous usage statistics, such as which tools are used and whether features work. We do not send job notes, customer details, photos, measurements or AI questions. You can choose not now.";
    copy.style.cssText = "margin:8px 0 12px;color:#e2e5df";
    const actions = document.createElement("div");
    actions.style.cssText = "display:flex;gap:8px;flex-wrap:wrap";
    const allow = document.createElement("button");
    allow.type = "button";
    allow.textContent = "Allow anonymous analytics";
    allow.style.cssText = "border:0;border-radius:8px;padding:10px 12px;background:#ff8a35;color:#202321;font-weight:700";
    const decline = document.createElement("button");
    decline.type = "button";
    decline.textContent = "Not now";
    decline.style.cssText = "border:1px solid #7c827a;border-radius:8px;padding:10px 12px;background:transparent;color:#fff";
    allow.addEventListener("click", () => {
      try { localStorage.setItem(CONSENT_KEY, "accepted"); } catch (_) {}
      banner.remove();
      track("app_open");
    });
    decline.addEventListener("click", () => {
      try { localStorage.setItem(CONSENT_KEY, "declined"); } catch (_) {}
      banner.remove();
    });
    actions.append(allow, decline);
    banner.append(title, copy, actions);
    document.body.append(banner);
  }

  document.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;

    if (button.hasAttribute("data-open")) {
      track("tool_open", { section: button.getAttribute("data-open") || "" });
      return;
    }
    const eventById = {
      buildMaterials: "materials_calculated",
      saveMaterials: "job_saved",
      saveChecklist: "checklist_saved",
      calculateGate: "gate_calculated",
      calculateCuts: "cuts_calculated",
      calculateNet: "netting_calculated",
      ask: "ai_request_started",
      saveEstimate: "estimate_saved",
      shareEstimate: "quote_shared"
    };
    if (eventById[button.id]) track(eventById[button.id]);
    if (button.textContent.trim() === "Find AVS price") track("avs_lookup_started");
  });

  // Record only the result category, never the prompt or response.
  const answer = document.getElementById("answer");
  if (answer && typeof MutationObserver !== "undefined") {
    let initial = true;
    const observer = new MutationObserver(() => {
      if (initial) { initial = false; return; }
      const text = answer.textContent || "";
      if (text.includes("Live AI could not connect")) track("ai_request_failed", { outcome: "failure" });
      else if (text && text !== "Your answer will appear here." && text !== "FENCE MATE is thinking…") {
        track("ai_request_succeeded", { outcome: "success" });
      }
    });
    observer.observe(answer, { childList: true, characterData: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", consentBanner, { once: true });
  } else {
    consentBanner();
  }
})();
