// Guides & news: buying guides, NTSA processes, import rules, market stats.
const router = require('express').Router();
const prisma = require('../db');

// GET /api/guides?category=BUYING_GUIDE
router.get('/', async (req, res, next) => {
  try {
    const where = req.query.category ? { category: req.query.category } : {};
    const guides = await prisma.guide.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, category: true, summary: true, createdAt: true }, // list view = no full content
    });
    res.json(guides);
  } catch (err) { next(err); }
});

// GET /api/guides/:id — full article
router.get('/:id', async (req, res, next) => {
  try {
    const guide = await prisma.guide.findUnique({ where: { id: Number(req.params.id) } });
    if (!guide) return res.status(404).json({ error: 'Guide not found' });
    res.json(guide);
  } catch (err) { next(err); }
});

module.exports = router;
