// Car listings: browse with filters, view one, create, update, mark sold.
const router = require('express').Router();
const prisma = require('../db');
const auth = require('../middleware/auth');

// Convert imagesJson (string in DB) into a real array for clients
function shape(listing) {
  return { ...listing, images: JSON.parse(listing.imagesJson || '[]'), imagesJson: undefined };
}

// GET /api/listings?make=Toyota&county=Nairobi&minPrice=500000&maxPrice=2000000&q=vitz
router.get('/', async (req, res, next) => {
  try {
    const { make, county, condition, minPrice, maxPrice, q } = req.query;
    const where = { status: 'AVAILABLE' };
    if (make) where.make = make;
    if (county) where.county = county;
    if (condition) where.condition = condition;
    if (minPrice || maxPrice) {
      where.priceKes = {};
      if (minPrice) where.priceKes.gte = Number(minPrice);
      if (maxPrice) where.priceKes.lte = Number(maxPrice);
    }
    if (q) where.title = { contains: q }; // simple text search on the title
    const listings = await prisma.listing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { seller: { select: { id: true, name: true, verification: true, county: true, avatarUrl: true } } },
    });
    res.json(listings.map(shape));
  } catch (err) { next(err); }
});

// GET /api/listings/mine/all — ALL my listings including SOLD (for managing posts)
router.get('/mine/all', auth.required, async (req, res, next) => {
  try {
    const listings = await prisma.listing.findMany({
      where: { sellerId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(listings.map(shape));
  } catch (err) { next(err); }
});

// GET /api/listings/:id — full detail incl. seller contact
router.get('/:id', async (req, res, next) => {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: Number(req.params.id) },
      include: { seller: { select: { id: true, name: true, phone: true, verification: true, county: true, avatarUrl: true } } },
    });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    res.json(shape(listing));
  } catch (err) { next(err); }
});

// POST /api/listings — create (must be logged in)
router.post('/', auth.required, async (req, res, next) => {
  try {
    const { title, make, model, year, priceKes, mileageKm, condition,
            transmission, fuelType, engineCc, county, description, images } = req.body;
    if (!title || !make || !model || !year || !priceKes || !county) {
      return res.status(400).json({ error: 'title, make, model, year, priceKes and county are required' });
    }
    const listing = await prisma.listing.create({
      data: {
        title, make, model,
        year: Number(year),
        priceKes: Number(priceKes),
        mileageKm: Number(mileageKm || 0),
        condition: condition || 'LOCALLY_USED',
        transmission, fuelType,
        engineCc: engineCc ? Number(engineCc) : null,
        county, description,
        imagesJson: JSON.stringify(images || []),
        sellerId: req.user.id,
      },
    });
    res.status(201).json(shape(listing));
  } catch (err) { next(err); }
});

// PUT /api/listings/:id — edit or mark sold (owner only)
router.put('/:id', auth.required, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.listing.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Listing not found' });
    if (existing.sellerId !== req.user.id) return res.status(403).json({ error: 'Not your listing' });

    const { images, ...fields } = req.body;
    const data = { ...fields };
    // never let clients overwrite these
    delete data.id; delete data.sellerId; delete data.seller; delete data.createdAt; delete data.imagesJson;
    // coerce numeric fields
    ['year', 'priceKes', 'mileageKm', 'engineCc'].forEach((k) => {
      if (data[k] !== undefined && data[k] !== null && data[k] !== '') data[k] = Number(data[k]);
      else if (data[k] === '') delete data[k];
    });
    if (data.status && !['AVAILABLE', 'SOLD'].includes(data.status)) delete data.status;
    if (images) data.imagesJson = JSON.stringify(images);
    const listing = await prisma.listing.update({ where: { id }, data });
    res.json(shape(listing));
  } catch (err) { next(err); }
});

// DELETE /api/listings/:id (owner only)
router.delete('/:id', auth.required, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.listing.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Listing not found' });
    if (existing.sellerId !== req.user.id) return res.status(403).json({ error: 'Not your listing' });
    // remove linked reels first (and their comments/likes/saves)
    const reelIds = (await prisma.reel.findMany({ where: { listingId: id }, select: { id: true } })).map((r) => r.id);
    await prisma.reelView.deleteMany({ where: { reelId: { in: reelIds } } });
    await prisma.reelComment.deleteMany({ where: { reelId: { in: reelIds } } });
    await prisma.reelLike.deleteMany({ where: { reelId: { in: reelIds } } });
    await prisma.savedReel.deleteMany({ where: { reelId: { in: reelIds } } });
    await prisma.reel.deleteMany({ where: { listingId: id } });
    await prisma.listing.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
