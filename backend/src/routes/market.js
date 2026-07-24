// Market price guide: approximate what a car should cost in the Kenyan market.
const router = require('express').Router();
const { estimate, REFERENCE } = require('../marketPrice');

// GET /api/market/price?make=Toyota&model=Axio&year=2011&condition=LOCALLY_USED
router.get('/price', async (req, res, next) => {
  try {
    const { make, model, year, condition } = req.query;
    if (!make || !model) return res.status(400).json({ error: 'make and model are required' });
    const result = await estimate({ make, model, year, condition });
    res.json({ make, model, year, condition, currency: 'KES', ...result });
  } catch (err) { next(err); }
});

// GET /api/market/models?make=Toyota — models we have reference data for (for dropdowns)
router.get('/models', (req, res) => {
  const mk = String(req.query.make || '').toLowerCase().trim();
  const models = REFERENCE[mk] ? Object.keys(REFERENCE[mk]) : [];
  res.json({ make: req.query.make, models });
});

module.exports = router;
