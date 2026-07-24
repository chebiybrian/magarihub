// Meta-search: one query, results from every connected source (AutoTempest-style).
// GET /api/metasearch?q=vitz&make=Toyota&minPrice=500000&maxPrice=2000000&county=Nairobi
//                    &sources=magarihub,partner&sort=price_asc
const router = require('express').Router();
const { magarihub, partnerDemo, linkSources } = require('../metasearch/sources');

router.get('/', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    const f = {
      make: req.query.make || '',
      model: req.query.model || '',
      county: req.query.county || '',
      minPrice: req.query.minPrice || '',
      maxPrice: req.query.maxPrice || '',
    };
    const enabled = (req.query.sources || 'magarihub,partner').split(',');

    // Query every enabled source in parallel — one failing source never kills the search
    const jobs = [];
    if (enabled.includes('magarihub')) jobs.push(magarihub(q, f));
    if (enabled.includes('partner')) jobs.push(Promise.resolve(partnerDemo(q, f)));
    const settled = await Promise.allSettled(jobs);
    let listings = settled.flatMap((s) => (s.status === 'fulfilled' ? s.value : []));

    // Unified sorting across all sources
    const sort = req.query.sort || '';
    if (sort === 'price_asc') listings.sort((a, b) => a.priceKes - b.priceKes);
    if (sort === 'price_desc') listings.sort((a, b) => b.priceKes - a.priceKes);
    if (sort === 'year_desc') listings.sort((a, b) => b.year - a.year);

    res.json({
      count: listings.length,
      listings,
      externalSearches: linkSources(q, f), // "continue your search on…" deep links
    });
  } catch (err) { next(err); }
});

module.exports = router;
