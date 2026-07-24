// Public profiles + verification badge requests.
// Verification flow: user requests -> status PENDING -> you approve (admin endpoint)
// -> badge becomes ID_VERIFIED (individuals) or DEALER_VERIFIED (car dealers).
const router = require('express').Router();
const prisma = require('../db');
const auth = require('../middleware/auth');

// PUT /api/users/me — update my profile (photo, bio, county, phone, name)
router.put('/me', auth.required, async (req, res, next) => {
  try {
    const allowed = ['avatarUrl', 'bio', 'county', 'phone', 'name'];
    const data = {};
    for (const k of allowed) if (req.body[k] !== undefined) data[k] = req.body[k];
    const user = await prisma.user.update({ where: { id: req.user.id }, data });
    const { passwordHash, ...safe } = user;
    res.json(safe);
  } catch (err) { next(err); }
});

// POST /api/users/:id/follow — toggle following this account
router.post('/:id/follow', auth.required, async (req, res, next) => {
  try {
    const followingId = Number(req.params.id);
    const followerId = req.user.id;
    if (followingId === followerId) return res.status(400).json({ error: "You can't follow yourself" });
    const target = await prisma.user.findUnique({ where: { id: followingId } });
    if (!target) return res.status(404).json({ error: 'User not found' });

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    if (existing) await prisma.follow.delete({ where: { id: existing.id } });
    else await prisma.follow.create({ data: { followerId, followingId } });

    const followersCount = await prisma.follow.count({ where: { followingId } });
    res.json({ following: !existing, followersCount });
  } catch (err) { next(err); }
});

// GET /api/users/:id/followers — who follows this account
router.get('/:id/followers', async (req, res, next) => {
  try {
    const rows = await prisma.follow.findMany({
      where: { followingId: Number(req.params.id) },
      orderBy: { createdAt: 'desc' },
      include: { follower: { select: { id: true, name: true, verification: true, avatarUrl: true } } },
    });
    res.json(rows.map((r) => r.follower));
  } catch (err) { next(err); }
});

// GET /api/users/:id/following — accounts this user follows
router.get('/:id/following', async (req, res, next) => {
  try {
    const rows = await prisma.follow.findMany({
      where: { followerId: Number(req.params.id) },
      orderBy: { createdAt: 'desc' },
      include: { following: { select: { id: true, name: true, verification: true, avatarUrl: true } } },
    });
    res.json(rows.map((r) => r.following));
  } catch (err) { next(err); }
});

// GET /api/users/:id — public profile with listings + follow counts
router.get('/:id', auth.optional, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, role: true, county: true, bio: true,
        avatarUrl: true, verification: true, createdAt: true,
        _count: { select: { followers: true, following: true } },
        listings: {
          where: { status: 'AVAILABLE' },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, title: true, priceKes: true, county: true,
            year: true, mileageKm: true, condition: true, imagesJson: true,
          },
        },
        reels: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, caption: true, views: true, likes: true },
        },
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    let followedByMe = false;
    if (req.user && req.user.id !== id) {
      followedByMe = !!(await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: req.user.id, followingId: id } },
      }));
    }
    res.json({
      ...user,
      _count: undefined,
      followersCount: user._count.followers,
      followingCount: user._count.following,
      followedByMe,
      listings: user.listings.map((l) => ({ ...l, images: JSON.parse(l.imagesJson || '[]'), imagesJson: undefined })),
    });
  } catch (err) { next(err); }
});

// POST /api/users/request-verification — logged-in user asks for a badge.
// In production you'd collect documents here (National ID, business permit).
router.post('/request-verification', auth.required, async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { verification: 'PENDING' },
    });
    res.json({ verification: user.verification, message: 'Verification request received. Our team will review your documents.' });
  } catch (err) { next(err); }
});

// POST /api/users/:id/approve-verification  { badge: "ID_VERIFIED" | "DEALER_VERIFIED" }
// Admin only — the caller's email must be in ADMIN_EMAILS (.env).
router.post('/:id/approve-verification', auth.admin, async (req, res, next) => {
  try {
    const badge = req.body.badge === 'DEALER_VERIFIED' ? 'DEALER_VERIFIED' : 'ID_VERIFIED';
    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: { verification: badge },
    });
    res.json({ id: user.id, verification: user.verification });
  } catch (err) { next(err); }
});

module.exports = router;
