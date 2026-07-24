// Car parts: search by name or manufacturer reference number.
const router = require('express').Router();
const prisma = require('../db');
const auth = require('../middleware/auth');

function shape(part) {
  return { ...part, images: JSON.parse(part.imagesJson || '[]'), imagesJson: undefined };
}

// GET /api/parts?q=oil+filter&ref=90915&county=Nairobi&condition=NEW
router.get('/', async (req, res, next) => {
  try {
    const { q, ref, county, condition } = req.query;
    const where = {};
    if (q) where.name = { contains: q };
    if (ref) where.referenceNo = { contains: ref }; // partial reference number search
    if (county) where.county = county;
    if (condition) where.condition = condition;
    const parts = await prisma.part.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { seller: { select: { id: true, name: true, phone: true, verification: true, avatarUrl: true } } },
    });
    res.json(parts.map(shape));
  } catch (err) { next(err); }
});

// POST /api/parts  { name, referenceNo, compatible, priceKes, condition?, county, images? }
router.post('/', auth.required, async (req, res, next) => {
  try {
    const { name, referenceNo, compatible, priceKes, condition, county, images } = req.body;
    if (!name || !referenceNo || !priceKes || !county) {
      return res.status(400).json({ error: 'name, referenceNo, priceKes and county are required' });
    }
    const part = await prisma.part.create({
      data: {
        name, referenceNo,
        compatible: compatible || '',
        priceKes: Number(priceKes),
        condition: condition || 'NEW',
        county,
        imagesJson: JSON.stringify(images || []),
        sellerId: req.user.id,
      },
    });
    res.status(201).json(shape(part));
  } catch (err) { next(err); }
});

// PUT /api/parts/:id — edit (owner only)
router.put('/:id', auth.required, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.part.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Part not found' });
    if (existing.sellerId !== req.user.id) return res.status(403).json({ error: 'Not your part' });

    const { images, ...fields } = req.body;
    const data = { ...fields };
    delete data.id; delete data.sellerId; delete data.seller; delete data.createdAt; delete data.imagesJson;
    if (data.priceKes !== undefined) data.priceKes = Number(data.priceKes);
    if (images) data.imagesJson = JSON.stringify(images);
    const part = await prisma.part.update({ where: { id }, data });
    res.json(shape(part));
  } catch (err) { next(err); }
});

// DELETE /api/parts/:id (owner only)
router.delete('/:id', auth.required, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.part.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Part not found' });
    if (existing.sellerId !== req.user.id) return res.status(403).json({ error: 'Not your part' });
    await prisma.part.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
