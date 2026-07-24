// Insurance: compare policies from Kenyan insurers + estimate a premium.
const router = require('express').Router();
const prisma = require('../db');

function shape(p) {
  return { ...p, features: JSON.parse(p.featuresJson || '[]'), featuresJson: undefined };
}

// GET /api/insurance?type=COMPREHENSIVE&company=Jubilee
router.get('/', async (req, res, next) => {
  try {
    const { type, company } = req.query;
    const where = {};
    if (type) where.type = type;
    if (company) where.company = company;
    const policies = await prisma.insurancePolicy.findMany({ where, orderBy: { company: 'asc' } });
    res.json(policies.map(shape));
  } catch (err) { next(err); }
});

// POST /api/insurance/quote  { carValueKes }
// Returns an estimated annual premium for every policy so users can compare.
router.post('/quote', async (req, res, next) => {
  try {
    const carValueKes = Number(req.body.carValueKes);
    if (!carValueKes || carValueKes <= 0) {
      return res.status(400).json({ error: 'carValueKes (car value in KES) is required' });
    }
    const policies = await prisma.insurancePolicy.findMany();
    const quotes = policies.map((p) => {
      let premium;
      if (p.annualRatePct) {
        premium = Math.round((carValueKes * p.annualRatePct) / 100);
        if (p.minPremiumKes && premium < p.minPremiumKes) premium = p.minPremiumKes;
      } else {
        premium = p.flatAnnualKes; // third-party: flat rate regardless of car value
      }
      return { ...shape(p), estimatedAnnualPremiumKes: premium };
    });
    quotes.sort((a, b) => (a.estimatedAnnualPremiumKes || 0) - (b.estimatedAnnualPremiumKes || 0));
    res.json({ carValueKes, quotes });
  } catch (err) { next(err); }
});

module.exports = router;
