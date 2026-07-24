// External price-reference sources for the market estimator.
//
// ⚠️ READ THIS BEFORE ENABLING ANY SOURCE ⚠️
// Most Kenyan car sites have NO public API and their terms prohibit scraping.
// Pulling their data can (a) violate their ToS, (b) get your server IP blocked,
// and (c) break whenever they change their pages. Facebook Marketplace in particular
// cannot be scraped lawfully (login + bot-detection) — there is no adapter for it here.
//
// The defensible pattern (what real price guides do):
//   • Only ever store AGGREGATE STATISTICS (a median/range per model-year),
//     never copies of other sites' listings.
//   • Refresh in the BACKGROUND on a schedule, never on every user request.
//   • Cache aggressively.
//   • Prefer a data PARTNERSHIP or a licensed dataset over scraping.
//
// Every source below is DISABLED by default. Turn one on only when you understand
// the legal position and accept responsibility. Enable via .env:
//   ENABLE_EXTERNAL_PRICE_SOURCES=1
//   PRICE_SOURCE_JIJI=1        (etc.)

const CACHE = new Map();            // key -> { at, prices }
const TTL_MS = 24 * 60 * 60 * 1000; // 24h — external data is only for a rough reference

function cacheGet(key) {
  const hit = CACHE.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.prices;
  return null;
}
function cacheSet(key, prices) { CACHE.set(key, { at: Date.now(), prices }); }

// Fetch with a hard timeout so a slow/blocked source never hangs the estimate.
async function fetchWithTimeout(url, opts = {}, ms = 6000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal, headers: { 'User-Agent': 'MagariHub/1.0', ...(opts.headers || {}) } });
  } finally { clearTimeout(t); }
}

const enc = encodeURIComponent;
const clean = (n) => {
  const v = Number(String(n).replace(/[^0-9]/g, ''));
  return v >= 50000 && v <= 100000000 ? v : null; // sane price band, drops junk
};

// ---------------- ADAPTERS ----------------
// Each returns an array of sample prices (KES). Implement fetch only for sources you're
// permitted to use. Keep them BEST-EFFORT: any error just yields [] and we fall back.
const ADAPTERS = [
  {
    id: 'jiji',
    name: 'Jiji Kenya',
    enabled: () => process.env.PRICE_SOURCE_JIJI === '1',
    // NOTE: Jiji exposes an internal JSON endpoint its own site calls. Using it
    // programmatically is subject to Jiji's terms — verify before enabling. Structure
    // shown so it CAN be implemented; treat as a template, not a guarantee.
    async fetchSamples({ make, model }) {
      const q = `${make} ${model}`.trim();
      const url = `https://jiji.co.ke/api_web/v1/listing?slug=cars&webp=true&query=${enc(q)}`;
      const res = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`Jiji ${res.status}`);
      const data = await res.json();
      const adverts = data?.adverts_list?.adverts || data?.adverts || [];
      return adverts.map((a) => clean(a.price || a.price_obj?.value)).filter(Boolean);
    },
  },
  // Add more adapters here only for sources you have permission to use, e.g. a
  // partnership feed or a dataset you license. Deep-link-only sites stay in sources.js.
];

// Gather external sample prices for one car, cached. Returns { prices, sources: {jiji: n, ...} }.
async function externalSamples({ make, model, year }) {
  if (process.env.ENABLE_EXTERNAL_PRICE_SOURCES !== '1') return { prices: [], sources: {} };

  const key = `${make}|${model}|${year || ''}`.toLowerCase();
  const cached = cacheGet(key);
  if (cached) return cached;

  const active = ADAPTERS.filter((a) => a.enabled());
  const results = await Promise.allSettled(active.map((a) => a.fetchSamples({ make, model, year })));

  const prices = [];
  const sources = {};
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && Array.isArray(r.value) && r.value.length) {
      prices.push(...r.value);
      sources[active[i].id] = r.value.length;
    }
  });

  const out = { prices, sources };
  cacheSet(key, out);
  return out;
}

module.exports = { externalSamples, ADAPTERS };
