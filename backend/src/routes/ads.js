// Sponsored ads shown in the banner on the listings page.
// Revenue idea: sell these slots to dealers, insurers and parts shops.
const router = require('express').Router();
const prisma = require('../db');
const auth = require('../middleware/auth');

const SAMPLE_ADS = [
  {
    title: 'Comprehensive Cover from 3.5% per Year',
    text: 'Compare motor insurance from Kenya\'s top insurers and pay via M-Pesa.',
    imageUrl: 'https://picsum.photos/seed/insurance-ad/1000/280',
    linkUrl: '/insurance',
    sponsor: 'MagariHub Insurance Partners',
  },
  {
    title: 'Genuine Parts with Reference Numbers',
    text: 'Oil filters, brake pads, suspension — search by part number, delivered countrywide.',
    imageUrl: 'https://picsum.photos/seed/parts-ad/1000/280',
    linkUrl: '/parts',
    sponsor: 'Kirinyaga Road Auto Spares',
  },
  {
    title: 'Importing via Mombasa? Read This First',
    text: 'The 8-year rule, KRA duties and clearing agents — our full import guide.',
    imageUrl: 'https://picsum.photos/seed/import-ad/1000/280',
    linkUrl: '/guides',
    sponsor: 'MagariHub Guides',
  },
];

// Special slide rendered as an animated metallic Kenyan flag by the apps
// (imageUrl acts as the marker rather than pointing at a photo).
const FLAG_AD = {
  title: 'Proudly Kenyan 🇰🇪',
  text: "Buy, sell and drive with confidence — MagariHub is built for Kenya's roads.",
  imageUrl: 'KENYA_FLAG',
  linkUrl: '/guides',
  sponsor: 'MagariHub',
};

// First run: load sample ads if the table is empty, and make sure the flag slide exists.
// (Silently skipped if the Ad table hasn't been created yet — run RESTART-SERVERS.bat to migrate.)
(async () => {
  try {
    if ((await prisma.ad.count()) === 0) {
      await prisma.ad.createMany({ data: SAMPLE_ADS });
      console.log('Sample ads loaded');
    }
    const hasFlag = await prisma.ad.findFirst({ where: { imageUrl: 'KENYA_FLAG' } });
    if (!hasFlag) {
      await prisma.ad.create({ data: FLAG_AD });
      console.log('Kenyan flag ad slide added');
    }
  } catch { /* table missing until migration runs */ }
})();

// GET /api/ads — active ads for the banner
router.get('/', async (req, res, next) => {
  try {
    const ads = await prisma.ad.findMany({ where: { active: true }, orderBy: { createdAt: 'desc' } });
    res.json(ads);
  } catch (err) { next(err); }
});

// POST /api/ads — create an ad.
// Admin only — the caller's email must be in ADMIN_EMAILS (.env).
router.post('/', auth.admin, async (req, res, next) => {
  try {
    const { title, text, imageUrl, linkUrl, sponsor } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });
    const ad = await prisma.ad.create({ data: { title, text, imageUrl, linkUrl, sponsor } });
    res.status(201).json(ad);
  } catch (err) { next(err); }
});

module.exports = router;
