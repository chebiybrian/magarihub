// Market price estimator.
//
// Two sources, blended:
//  1. REAL DATA — actual MagariHub listings of the same make/model/year(±1)/condition.
//     When we have enough, the range is computed from real asking prices (most honest).
//  2. REFERENCE MODEL — a curated table of typical Kenyan-market prices for common models,
//     adjusted by year (depreciation) and condition. Used when listing data is thin.
//
// All figures are ESTIMATES in KES to help buyers/sellers sanity-check a price.
const prisma = require('./db');
const { externalSamples } = require('./priceSources');

// Typical price (KES) of a ~2015, LOCALLY-USED example of each model. The estimator
// adjusts from here for other years and conditions. Rough market figures — refine over time.
const REFERENCE = {
  toyota: {
    vitz: 900000, passo: 800000, axio: 1300000, fielder: 1400000, premio: 1800000,
    allion: 1750000, probox: 1100000, succeed: 1150000, corolla: 1250000, ractis: 950000,
    'land cruiser': 8000000, prado: 5500000, harrier: 3200000, 'rav4': 2800000,
    hilux: 2800000, wish: 1300000, noah: 1900000, voxy: 2000000, mark_x: 1900000, aqua: 1200000,
  },
  mazda: { demio: 850000, axela: 1300000, atenza: 1600000, 'cx-5': 2800000, 'cx-3': 2200000, premacy: 1100000 },
  nissan: { note: 950000, tiida: 800000, 'x-trail': 2600000, juke: 1400000, wingroad: 950000, dualis: 1600000, teana: 1500000, march: 750000 },
  subaru: { impreza: 1700000, forester: 2600000, outback: 2800000, legacy: 1900000, xv: 2200000 },
  honda: { fit: 1000000, vezel: 2300000, 'cr-v': 2400000, insight: 1100000, 'grace': 1400000, freed: 1500000 },
  mitsubishi: { outlander: 2000000, lancer: 1200000, pajero: 3800000, 'rvr': 1600000 },
  volkswagen: { golf: 1600000, polo: 1300000, tiguan: 2600000, passat: 1800000 },
  'mercedes-benz': { c200: 3200000, e250: 4500000, 'c180': 3000000, ml350: 5000000 },
  bmw: { '320i': 2800000, '318i': 2600000, x5: 5500000, x3: 3800000, '520i': 3500000 },
  suzuki: { swift: 950000, alto: 650000, vitara: 1800000, 'escudo': 1900000 },
  isuzu: { dmax: 3200000, 'd-max': 3200000 },
};

const REF_YEAR = 2015;
const DEP_RATE = 0.09;              // ~9% value change per year away from the reference year
const CONDITION_MULT = { FOREIGN_USED: 1.08, LOCALLY_USED: 1.0, NEW: 1.9 };
const round = (n) => Math.round(n / 10000) * 10000;

function referenceEstimate({ make, model, year, condition }) {
  const mk = String(make || '').toLowerCase().trim();
  const md = String(model || '').toLowerCase().trim();
  const base = REFERENCE[mk]?.[md];
  if (!base) return null; // unknown model — no reference figure

  const yrs = (Number(year) || REF_YEAR) - REF_YEAR;
  let mid = base * Math.pow(1 + DEP_RATE, yrs);       // newer worth more, older less
  mid *= CONDITION_MULT[condition] || 1;
  mid = Math.max(mid, 250000);                        // price floor
  return { low: round(mid * 0.82), mid: round(mid), high: round(mid * 1.18) };
}

// Simple percentile from a sorted array
function pct(sorted, p) {
  if (sorted.length === 1) return sorted[0];
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i), hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

// Main entry
async function estimate({ make, model, year, condition }) {
  const yr = Number(year);
  // 1) Pull real listings of the same model, ±1 year, same condition if given
  const where = {
    make: { equals: make },
    model: { equals: model },
  };
  if (yr) where.year = { gte: yr - 1, lte: yr + 1 };
  if (condition) where.condition = condition;

  let listings = [];
  try {
    listings = await prisma.listing.findMany({ where, select: { priceKes: true } });
  } catch { /* ignore */ }

  const ownPrices = listings.map((l) => l.priceKes).filter((p) => p > 0);

  // Optional external reference samples (Jiji etc.) — only if enabled in .env
  let ext = { prices: [], sources: {} };
  try { ext = await externalSamples({ make, model, year }); } catch { /* best-effort */ }

  // Combine real data from all sources
  const prices = [...ownPrices, ...ext.prices].filter((p) => p > 0).sort((a, b) => a - b);
  const extCount = ext.prices.length;

  if (prices.length >= 3) {
    // Enough real data — trust it
    const parts = [];
    if (ownPrices.length) parts.push(`${ownPrices.length} on MagariHub`);
    Object.entries(ext.sources).forEach(([id, n]) => parts.push(`${n} on ${id.charAt(0).toUpperCase() + id.slice(1)}`));
    return {
      low: round(pct(prices, 0.15)),
      mid: round(pct(prices, 0.5)),
      high: round(pct(prices, 0.85)),
      basis: extCount ? 'listings+external' : 'listings',
      sampleSize: prices.length,
      sources: { magarihub: ownPrices.length, ...ext.sources },
      note: `Based on ${prices.length} similar cars (${parts.join(', ')}).`,
    };
  }

  // 2) Fall back to the reference model
  const ref = referenceEstimate({ make, model, year, condition });
  if (ref) {
    return {
      ...ref,
      basis: prices.length ? 'reference+listings' : 'reference',
      sampleSize: prices.length,
      note: prices.length
        ? `Estimated from market data (only ${prices.length} live listing${prices.length === 1 ? '' : 's'} so far).`
        : 'Estimated from typical Kenyan market prices for this model.',
    };
  }

  // 3) Nothing we can say confidently
  return {
    low: null, mid: null, high: null, basis: 'none', sampleSize: prices.length,
    note: "We don't have enough market data for this exact model yet.",
  };
}

module.exports = { estimate, REFERENCE };
