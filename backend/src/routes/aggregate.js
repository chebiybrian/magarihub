// Meta-search / aggregator: one search, results from MagariHub PLUS deep links
// into every external platform (Jiji, Kai & Karo, Facebook, BeForward, SBT, etc.).
const router = require('express').Router();
const prisma = require('../db');
const { SOURCES, externalSearchLinks } = require('../sources');

// GET /api/aggregate/sources — list of platforms we fan out to (for the UI)
router.get('/sources', (req, res) => {
  res.json(SOURCES.map((s) => ({
    id: s.id, name: s.name, color: s.color, country: s.country, note: s.note,
  })));
});

// GET /api/aggregate/search?make=Toyota&model=Vitz&q=&maxPrice=&minPrice=&county=
// Returns:
//   { params, magarihub: [...real listings...], external: [...deep-link cards...] }
router.get('/search', async (req, res, next) => {
  try {
    const { make, model, q, county, minPrice, maxPrice } = req.query;

    // --- MagariHub's own listings (real results, shown first) ---
    const where = { status: 'AVAILABLE' };
    if (make) where.make = make;
    if (county) where.county = county;
    if (minPrice || maxPrice) {
      where.priceKes = {};
      if (minPrice) where.priceKes.gte = Number(minPrice);
      if (maxPrice) where.priceKes.lte = Number(maxPrice);
    }
    // free text: match against title (covers model + trim + keywords)
    const text = [model, q].filter(Boolean).join(' ').trim();
    if (text) where.title = { contains: text };

    const listings = await prisma.listing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { seller: { select: { id: true, name: true, verification: true, avatarUrl: true } } },
    });

    const magarihub = listings.map((l) => ({
      source: 'magarihub',
      sourceName: 'MagariHub',
      sourceColor: '#1a7a3a',
      external: false,
      id: l.id,
      title: l.title,
      priceKes: l.priceKes,
      year: l.year,
      county: l.county,
      condition: l.condition,
      imageUrl: JSON.parse(l.imagesJson || '[]')[0] || null,
      url: `/listings/${l.id}`, // internal route
      seller: l.seller,
    }));

    // --- External platforms: correct deep links pre-filtered to this search ---
    const external = externalSearchLinks({ make, model, q, minPrice, maxPrice, county });

    res.json({
      params: { make, model, q, county, minPrice, maxPrice },
      magarihub,
      external,
      counts: { magarihub: magarihub.length, external: external.length },
    });
  } catch (err) { next(err); }
});

module.exports = router;
