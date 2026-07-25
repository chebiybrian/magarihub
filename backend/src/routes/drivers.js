// Drivers for hire: browse, and apply as a driver (licence required + AI-vetted).
const router = require('express').Router();
const prisma = require('../db');
const auth = require('../middleware/auth');
const { vetLicense, vettingMode } = require('../licenseVet');

// Only VERIFIED drivers appear in the tab. displayName = the name read off the licence.
function shape(d) {
  return {
    ...d,
    displayName: d.licenseName || d.user?.name, // official name from the vetted licence
    licenseFileUrl: undefined, // don't expose the private scan to browsers
  };
}

// GET /api/drivers?county=Nairobi&licenseClass=D&psv=true
router.get('/', async (req, res, next) => {
  try {
    const { county, licenseClass, psv } = req.query;
    const where = { available: true, vetStatus: 'VERIFIED' }; // only vetted drivers are listed
    if (county) where.county = county;
    if (psv === 'true') where.hasPsvBadge = true;
    if (licenseClass) where.licenseClasses = { contains: licenseClass };
    const drivers = await prisma.driverProfile.findMany({
      where,
      orderBy: [{ rating: 'desc' }, { yearsExperience: 'desc' }],
      include: { user: { select: { id: true, name: true, phone: true, verification: true, avatarUrl: true } } },
    });
    res.json(drivers.map(shape));
  } catch (err) { next(err); }
});

// GET /api/drivers/me — my own driver profile (incl. vetting status)
router.get('/me', auth.required, async (req, res, next) => {
  try {
    const d = await prisma.driverProfile.findUnique({ where: { userId: req.user.id } });
    res.json(d ? shape(d) : null);
  } catch (err) { next(err); }
});

// PUT /api/drivers/me — update my driver details (rate, county, availability, etc.)
// Licence stays as vetted; no re-verification needed for these edits.
router.put('/me', auth.required, async (req, res, next) => {
  try {
    const existing = await prisma.driverProfile.findUnique({ where: { userId: req.user.id } });
    if (!existing) return res.status(404).json({ error: 'You do not have a driver profile yet' });

    const { dailyRateKes, county, about, yearsExperience, hasPsvBadge, available, licenseClasses } = req.body;
    const data = {};
    if (dailyRateKes !== undefined) {
      const rate = Number(dailyRateKes);
      if (!rate || rate < 1) return res.status(400).json({ error: 'Enter a valid daily rate' });
      data.dailyRateKes = rate;
    }
    if (county !== undefined) data.county = county;
    if (about !== undefined) data.about = about;
    if (yearsExperience !== undefined) data.yearsExperience = Number(yearsExperience) || 0;
    if (hasPsvBadge !== undefined) data.hasPsvBadge = Boolean(hasPsvBadge);
    if (available !== undefined) data.available = Boolean(available);
    if (licenseClasses !== undefined) data.licenseClasses = licenseClasses;

    const profile = await prisma.driverProfile.update({ where: { userId: req.user.id }, data });
    res.json(shape(profile));
  } catch (err) { next(err); }
});

// POST /api/drivers/apply — become a driver. Requires a licence scan, which is
// AI-vetted (< 31s). On VERIFIED the name from the licence becomes the official name.
// Body: { licenseFileUrl, typedName?, dailyRateKes, county, about?, hasPsvBadge?, yearsExperience? }
router.post('/apply', auth.required, async (req, res, next) => {
  try {
    const { licenseFileUrl, typedName, dailyRateKes, county, about, hasPsvBadge, yearsExperience } = req.body;
    if (!licenseFileUrl) return res.status(400).json({ error: 'A photo or PDF of your driving licence is required' });
    if (!dailyRateKes || !county) return res.status(400).json({ error: 'Daily rate and county are required' });

    // AI vetting (self-timing, always returns within the budget)
    const vet = await vetLicense({ fileUrl: licenseFileUrl, typedName });

    if (vet.vetStatus !== 'VERIFIED') {
      // Save the attempt so they can see why, but don't list them
      await prisma.driverProfile.upsert({
        where: { userId: req.user.id },
        create: {
          userId: req.user.id, licenseClasses: '', dailyRateKes: Number(dailyRateKes),
          yearsExperience: Number(yearsExperience || 0), county, about,
          licenseFileUrl, vetStatus: vet.vetStatus, vetNotes: vet.notes, available: false,
        },
        update: { licenseFileUrl, vetStatus: vet.vetStatus, vetNotes: vet.notes, available: false },
      });
      return res.status(200).json({ vetStatus: vet.vetStatus, notes: vet.notes, tookMs: vet.tookMs, demo: vet.demo });
    }

    // VERIFIED — create/update the driver profile with the licence-derived details
    const data = {
      licenseClasses: vet.licenseClasses || req.body.licenseClasses || '',
      hasPsvBadge: Boolean(hasPsvBadge),
      yearsExperience: Number(yearsExperience || 0),
      dailyRateKes: Number(dailyRateKes),
      county, about,
      available: true,
      licenseName: vet.licenseName,
      licenseNumber: vet.licenseNumber,
      licenseExpiry: vet.licenseExpiry,
      licenseFileUrl,
      vetStatus: 'VERIFIED',
      vetNotes: vet.notes,
      vettedAt: new Date(),
    };
    const profile = await prisma.driverProfile.upsert({
      where: { userId: req.user.id },
      create: { ...data, userId: req.user.id },
      update: data,
    });
    await prisma.user.update({ where: { id: req.user.id }, data: { role: 'DRIVER' } });

    res.status(201).json({
      vetStatus: 'VERIFIED', tookMs: vet.tookMs, demo: vet.demo, notes: vet.notes,
      licenseName: vet.licenseName, licenseNumber: vet.licenseNumber,
      licenseClasses: data.licenseClasses, licenseExpiry: vet.licenseExpiry,
      profile: shape(profile),
    });
  } catch (err) { next(err); }
});

// GET /api/drivers/vetting-status — which reading engine is live: 'ai' | 'ocr' | 'demo'.
router.get('/vetting-status', (req, res) => {
  const mode = vettingMode();
  res.json({ live: mode !== 'demo', mode });
});

// ---------- REVIEWS & RATINGS ----------

// Recalculate a driver's average rating and review count
async function refreshRating(driverId) {
  const agg = await prisma.driverReview.aggregate({
    where: { driverId },
    _avg: { rating: true },
    _count: true,
  });
  await prisma.driverProfile.update({
    where: { id: driverId },
    data: {
      rating: Math.round((agg._avg.rating || 0) * 10) / 10, // one decimal
      reviewCount: agg._count,
    },
  });
}

// GET /api/drivers/:id/reviews — all reviews for a driver (newest first)
router.get('/:id/reviews', auth.optional, async (req, res, next) => {
  try {
    const driverId = Number(req.params.id);
    const reviews = await prisma.driverReview.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, name: true, avatarUrl: true, verification: true } } },
    });
    const mine = req.user ? reviews.find((r) => r.authorId === req.user.id) || null : null;
    const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    res.json({ reviews, count: reviews.length, average: Math.round(avg * 10) / 10, mine });
  } catch (err) { next(err); }
});

// POST /api/drivers/:id/reviews  { rating: 1-5, comment? }
// One review per person per driver — posting again updates your existing review.
router.post('/:id/reviews', auth.required, async (req, res, next) => {
  try {
    const driverId = Number(req.params.id);
    const rating = Number(req.body.rating);
    const comment = (req.body.comment || '').trim().slice(0, 600) || null;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Give a rating between 1 and 5 stars' });

    const driver = await prisma.driverProfile.findUnique({ where: { id: driverId } });
    if (!driver) return res.status(404).json({ error: 'Driver not found' });
    if (driver.userId === req.user.id) return res.status(400).json({ error: "You can't review yourself" });

    const review = await prisma.driverReview.upsert({
      where: { driverId_authorId: { driverId, authorId: req.user.id } },
      create: { driverId, authorId: req.user.id, rating, comment },
      update: { rating, comment },
      include: { author: { select: { id: true, name: true, avatarUrl: true, verification: true } } },
    });
    await refreshRating(driverId);

    const updated = await prisma.driverProfile.findUnique({ where: { id: driverId } });
    res.status(201).json({ review, rating: updated.rating, reviewCount: updated.reviewCount });
  } catch (err) { next(err); }
});

// DELETE /api/drivers/:id/reviews/mine — remove my review
router.delete('/:id/reviews/mine', auth.required, async (req, res, next) => {
  try {
    const driverId = Number(req.params.id);
    const existing = await prisma.driverReview.findUnique({
      where: { driverId_authorId: { driverId, authorId: req.user.id } },
    });
    if (!existing) return res.status(404).json({ error: 'You have no review on this driver' });
    await prisma.driverReview.delete({ where: { id: existing.id } });
    await refreshRating(driverId);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/drivers — create/update my driver profile
// { licenseClasses: "B,C1", hasPsvBadge, yearsExperience, dailyRateKes, county, about }
router.post('/', auth.required, async (req, res, next) => {
  try {
    const { licenseClasses, hasPsvBadge, yearsExperience, dailyRateKes, county, about, available } = req.body;
    if (!licenseClasses || !dailyRateKes || !county) {
      return res.status(400).json({ error: 'licenseClasses, dailyRateKes and county are required' });
    }
    const data = {
      licenseClasses,
      hasPsvBadge: Boolean(hasPsvBadge),
      yearsExperience: Number(yearsExperience || 0),
      dailyRateKes: Number(dailyRateKes),
      county, about,
      available: available !== false,
    };
    const profile = await prisma.driverProfile.upsert({
      where: { userId: req.user.id },
      create: { ...data, userId: req.user.id },
      update: data,
    });
    // Mark the account as a driver account
    await prisma.user.update({ where: { id: req.user.id }, data: { role: 'DRIVER' } });
    res.status(201).json(profile);
  } catch (err) { next(err); }
});

module.exports = router;
