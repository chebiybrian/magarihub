// Meta-search source adapters (AutoTempest-style).
//
// Two kinds of sources:
//  - NATIVE: return real listing objects we render in the unified results grid.
//  - LINK: platforms with no public API (and terms that forbid scraping) get a
//    pre-filled search link instead — the same approach AutoTempest uses for
//    sites like Craigslist. One click opens YOUR search on THEIR site.
//
// When you sign an API partnership with a platform, replace its link entry
// with a native adapter function here — nothing else needs to change.
const prisma = require('../db');

const searchText = (q, f) => [f.make, f.model, q].filter(Boolean).join(' ').trim();

// ---------- NATIVE: MagariHub (our own database) ----------
async function magarihub(q, f) {
  const where = { status: 'AVAILABLE' };
  if (f.make) where.make = f.make;
  if (f.model) where.model = { contains: f.model };
  if (f.county) where.county = f.county;
  if (f.minPrice || f.maxPrice) {
    where.priceKes = {};
    if (f.minPrice) where.priceKes.gte = Number(f.minPrice);
    if (f.maxPrice) where.priceKes.lte = Number(f.maxPrice);
  }
  if (q) where.title = { contains: q };
  const rows = await prisma.listing.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 60,
    include: { seller: { select: { name: true, verification: true } } },
  });
  return rows.map((l) => ({
    id: `mh-${l.id}`,
    internalId: l.id, // present = opens inside MagariHub
    title: l.title,
    priceKes: l.priceKes,
    year: l.year,
    mileageKm: l.mileageKm,
    county: l.county,
    image: JSON.parse(l.imagesJson || '[]')[0] || null,
    source: 'MagariHub',
    sourceUrl: null,
    sellerName: l.seller?.name,
  }));
}

// ---------- NATIVE (DEMO): partner feed ----------
// Sample data so you can SEE multi-source aggregation working.
// Replace with real partner/API adapters — the card format is identical.
const PARTNER_DEMO = [
  { title: '2015 Toyota Axio 1.5L Hybrid', priceKes: 1180000, year: 2015, mileageKm: 98000, county: 'Mombasa',
    image: 'https://picsum.photos/seed/axio/800/500', sourceUrl: 'https://jiji.co.ke/search?query=toyota%20axio' },
  { title: '2017 Mazda CX-5 2.2L Diesel AWD', priceKes: 2650000, year: 2017, mileageKm: 76000, county: 'Nairobi',
    image: 'https://picsum.photos/seed/cx5/800/500', sourceUrl: 'https://www.kaiandkaro.com/vehicles' },
  { title: '2016 Honda Vezel 1.5L Hybrid RS', priceKes: 1750000, year: 2016, mileageKm: 88000, county: 'Nairobi',
    image: 'https://picsum.photos/seed/vezel/800/500', sourceUrl: 'https://www.beforward.jp' },
  { title: '2014 Volkswagen Golf 1.2 TSI', priceKes: 1050000, year: 2014, mileageKm: 110000, county: 'Nakuru',
    image: 'https://picsum.photos/seed/golf/800/500', sourceUrl: 'https://jiji.co.ke/search?query=vw%20golf' },
  { title: '2018 Toyota Hilux Double Cab 2.8L', priceKes: 4900000, year: 2018, mileageKm: 91000, county: 'Eldoret',
    image: 'https://picsum.photos/seed/hilux/800/500', sourceUrl: 'https://www.kaiandkaro.com/vehicles' },
];

function partnerDemo(q, f) {
  const term = searchText(q, f).toLowerCase();
  return PARTNER_DEMO
    .filter((c) => {
      if (term && !c.title.toLowerCase().includes(term.split(' ')[0])) return false;
      if (f.minPrice && c.priceKes < Number(f.minPrice)) return false;
      if (f.maxPrice && c.priceKes > Number(f.maxPrice)) return false;
      if (f.county && c.county !== f.county) return false;
      return true;
    })
    .map((c, i) => ({ ...c, id: `pd-${i}`, internalId: null, source: 'Partner Demo' }));
}

// ---------- LINK sources: one click opens your search on their site ----------
function linkSources(q, f) {
  const term = encodeURIComponent(searchText(q, f) || 'cars');
  return [
    { source: 'Jiji Kenya', note: "Kenya's biggest classifieds", url: `https://jiji.co.ke/search?query=${term}` },
    { source: 'Kai & Karo', note: 'Nairobi dealer marketplace', url: `https://www.kaiandkaro.com/vehicles?search=${term}` },
    { source: 'BE FORWARD', note: 'Import direct from Japan', url: `https://www.beforward.jp/stocklist/keyword=${term}` },
    { source: 'Facebook Marketplace', note: 'Private sellers near you', url: `https://www.facebook.com/marketplace/nairobi/search?query=${term}` },
    { source: 'Autochek Kenya', note: 'Listings with financing', url: 'https://autochek.africa/ke/cars-for-sale' },
  ];
}

module.exports = { magarihub, partnerDemo, linkSources };
