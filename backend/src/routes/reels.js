// Reels: TikTok-style feed with per-user likes, comments, saves and shares,
// plus a personalized "For You" ranking built from watch history.
const router = require('express').Router();
const prisma = require('../db');
const auth = require('../middleware/auth');

// ---------- "For You" recommendation engine ----------
// Learns from what you watch, like, save and comment on:
// which AUTHORS you engage with and which CAR MAKES you watch.
async function buildAffinity(userId) {
  const reelInfo = { reel: { select: { id: true, authorId: true, listing: { select: { make: true } } } } };
  const [views, likes, saves, comments, follows] = await Promise.all([
    prisma.reelView.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 300, include: reelInfo }),
    prisma.reelLike.findMany({ where: { userId }, include: reelInfo }),
    prisma.savedReel.findMany({ where: { userId }, include: reelInfo }),
    prisma.reelComment.findMany({ where: { authorId: userId }, include: reelInfo }),
    prisma.follow.findMany({ where: { followerId: userId }, select: { followingId: true } }),
  ]);

  const authorW = {}; // authorId -> engagement weight
  const makeW = {};   // car make -> engagement weight
  const watchedCount = {}; // reelId -> times watched (to downrank seen videos)

  const add = (r, w) => {
    if (!r) return;
    authorW[r.authorId] = (authorW[r.authorId] || 0) + w;
    const make = r.listing?.make;
    if (make) makeW[make] = (makeW[make] || 0) + w;
  };
  views.forEach((v) => { add(v.reel, 1); watchedCount[v.reelId] = (watchedCount[v.reelId] || 0) + 1; });
  likes.forEach((l) => add(l.reel, 3));    // a like is worth 3 views
  comments.forEach((c) => add(c.reel, 4)); // a comment 4
  saves.forEach((s) => add(s.reel, 5));    // a save 5 — strongest signal

  return { authorW, makeW, watchedCount, followedSet: new Set(follows.map((f) => f.followingId)) };
}

function scoreReel(r, aff) {
  const ageDays = (Date.now() - new Date(r.createdAt).getTime()) / 86400000;
  // baseline: popularity + freshness
  let score = 2 * Math.log1p(r.likes) + Math.log1p(r.views) + Math.max(0, 5 - ageDays * 0.3);
  if (aff) {
    score += 2.5 * Math.log1p(aff.authorW[r.author?.id] || 0); // authors you engage with
    score += 2.0 * Math.log1p(aff.makeW[r.listing?.make] || 0); // car makes you watch
    if (aff.followedSet?.has(r.author?.id)) score += 3; // people you follow rank higher
    const seen = aff.watchedCount[r.id] || 0;
    if (seen > 0) score -= 4 + Math.min(4, seen); // keep the feed fresh
  }
  score += Math.random() * 1.5; // exploration — mix in surprises like TikTok does
  return score;
}

// GET /api/reels?feed=foryou|latest&q=prado
// "latest" = newest first. "foryou" = personalized ranking from your watch history
// (new or logged-out users get trending videos until there's history to learn from).
router.get('/', auth.optional, async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    const feed = ['foryou', 'following'].includes(req.query.feed) ? req.query.feed : 'latest';
    const where = q
      ? {
          OR: [
            { caption: { contains: q } },
            { author: { name: { contains: q } } },
            { listing: { title: { contains: q } } },
          ],
        }
      : {};

    // "Following" feed: only videos from accounts you follow, newest first
    if (feed === 'following') {
      if (!req.user) return res.json([]);
      const follows = await prisma.follow.findMany({
        where: { followerId: req.user.id },
        select: { followingId: true },
      });
      where.authorId = { in: follows.map((f) => f.followingId) };
    }
    let reels = await prisma.reel.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 300, // rank the 300 most recent
      include: {
        author: { select: { id: true, name: true, verification: true, avatarUrl: true } },
        listing: { select: { id: true, title: true, priceKes: true, make: true } },
        _count: { select: { comments: true } },
      },
    });

    if (feed === 'foryou') {
      const aff = req.user ? await buildAffinity(req.user.id) : null;
      reels = reels
        .map((r) => ({ r, score: scoreReel(r, aff) }))
        .sort((a, b) => b.score - a.score)
        .map((x) => x.r);
    }
    let likedIds = new Set();
    let savedIds = new Set();
    let followedAuthors = new Set();
    if (req.user) {
      const ids = reels.map((r) => r.id);
      const authorIds = [...new Set(reels.map((r) => r.author.id))];
      const [likes, saves, follows] = await Promise.all([
        prisma.reelLike.findMany({ where: { userId: req.user.id, reelId: { in: ids } }, select: { reelId: true } }),
        prisma.savedReel.findMany({ where: { userId: req.user.id, reelId: { in: ids } }, select: { reelId: true } }),
        prisma.follow.findMany({ where: { followerId: req.user.id, followingId: { in: authorIds } }, select: { followingId: true } }),
      ]);
      likedIds = new Set(likes.map((l) => l.reelId));
      savedIds = new Set(saves.map((s) => s.reelId));
      followedAuthors = new Set(follows.map((f) => f.followingId));
    }
    res.json(reels.map((r) => ({
      ...r,
      _count: undefined,
      commentsCount: r._count.comments,
      likedByMe: likedIds.has(r.id),
      savedByMe: savedIds.has(r.id),
      author: {
        ...r.author,
        followedByMe: followedAuthors.has(r.author.id),
        isMe: req.user ? r.author.id === req.user.id : false,
      },
    })));
  } catch (err) { next(err); }
});

// GET /api/reels/saved/mine — my saved videos (for the profile page)
router.get('/saved/mine', auth.required, async (req, res, next) => {
  try {
    const saved = await prisma.savedReel.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        reel: {
          include: {
            author: { select: { id: true, name: true, verification: true, avatarUrl: true } },
            listing: { select: { id: true, title: true, priceKes: true } },
          },
        },
      },
    });
    res.json(saved.map((s) => s.reel));
  } catch (err) { next(err); }
});

// GET /api/reels/mine — my own reels (used to link reels to a car listing)
router.get('/mine', auth.required, async (req, res, next) => {
  try {
    const reels = await prisma.reel.findMany({
      where: { authorId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, caption: true, videoUrl: true, listingId: true, views: true, likes: true, createdAt: true },
    });
    res.json(reels);
  } catch (err) { next(err); }
});

// PUT /api/reels/:id — update my reel (caption, or which car it links to)
// Body: { caption?, listingId? }  — listingId: null unlinks it from any car.
router.put('/:id', auth.required, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const reel = await prisma.reel.findUnique({ where: { id } });
    if (!reel) return res.status(404).json({ error: 'Reel not found' });
    if (reel.authorId !== req.user.id) return res.status(403).json({ error: 'Not your reel' });

    const data = {};
    if (req.body.caption !== undefined) data.caption = req.body.caption;
    if (req.body.listingId !== undefined) {
      if (req.body.listingId === null || req.body.listingId === '') {
        data.listingId = null;
      } else {
        const listing = await prisma.listing.findUnique({ where: { id: Number(req.body.listingId) } });
        if (!listing) return res.status(404).json({ error: 'Listing not found' });
        if (listing.sellerId !== req.user.id) return res.status(403).json({ error: 'Not your listing' });
        data.listingId = listing.id;
      }
    }
    const updated = await prisma.reel.update({ where: { id }, data });
    res.json(updated);
  } catch (err) { next(err); }
});

// POST /api/reels  { videoUrl, caption?, listingId? }
router.post('/', auth.required, async (req, res, next) => {
  try {
    const { videoUrl, caption, listingId } = req.body;
    if (!videoUrl) return res.status(400).json({ error: 'videoUrl is required' });
    const reel = await prisma.reel.create({
      data: { videoUrl, caption, listingId: listingId ? Number(listingId) : null, authorId: req.user.id },
    });
    res.status(201).json(reel);
  } catch (err) { next(err); }
});

// POST /api/reels/:id/like  { ensure?: true }
// Toggles your like. With ensure:true (double-tap) it only likes, never un-likes.
router.post('/:id/like', auth.required, async (req, res, next) => {
  try {
    const reelId = Number(req.params.id);
    const userId = req.user.id;
    const existing = await prisma.reelLike.findUnique({ where: { reelId_userId: { reelId, userId } } });

    if (existing && req.body?.ensure) {
      const reel = await prisma.reel.findUnique({ where: { id: reelId } });
      return res.json({ liked: true, likes: reel.likes });
    }
    if (existing) {
      await prisma.reelLike.delete({ where: { id: existing.id } });
      const reel = await prisma.reel.update({ where: { id: reelId }, data: { likes: { decrement: 1 } } });
      return res.json({ liked: false, likes: reel.likes });
    }
    await prisma.reelLike.create({ data: { reelId, userId } });
    const reel = await prisma.reel.update({ where: { id: reelId }, data: { likes: { increment: 1 } } });
    res.status(201).json({ liked: true, likes: reel.likes });
  } catch (err) { next(err); }
});

// POST /api/reels/:id/save — toggle bookmark
router.post('/:id/save', auth.required, async (req, res, next) => {
  try {
    const reelId = Number(req.params.id);
    const userId = req.user.id;
    const existing = await prisma.savedReel.findUnique({ where: { reelId_userId: { reelId, userId } } });
    if (existing) {
      await prisma.savedReel.delete({ where: { id: existing.id } });
      return res.json({ saved: false });
    }
    await prisma.savedReel.create({ data: { reelId, userId } });
    res.status(201).json({ saved: true });
  } catch (err) { next(err); }
});

// GET /api/reels/:id/comments — top-level comments (newest first), each with its replies nested.
// If logged in, each comment includes likedByMe so the heart shows the right state.
router.get('/:id/comments', auth.optional, async (req, res, next) => {
  try {
    const authorSel = { select: { id: true, name: true, verification: true, avatarUrl: true } };
    const all = await prisma.reelComment.findMany({
      where: { reelId: Number(req.params.id) },
      orderBy: { createdAt: 'asc' },
      include: { author: authorSel },
    });

    let likedIds = new Set();
    if (req.user) {
      const likes = await prisma.commentLike.findMany({
        where: { userId: req.user.id, commentId: { in: all.map((c) => c.id) } },
        select: { commentId: true },
      });
      likedIds = new Set(likes.map((l) => l.commentId));
    }
    const shape = (c) => ({ ...c, likedByMe: likedIds.has(c.id) });

    // group replies under their parent
    const replies = {};
    all.forEach((c) => { if (c.parentId) (replies[c.parentId] ||= []).push(shape(c)); });
    const top = all
      .filter((c) => !c.parentId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // newest top-level first
      .map((c) => ({ ...shape(c), replies: (replies[c.id] || []) })); // replies stay oldest-first

    res.json(top);
  } catch (err) { next(err); }
});

// POST /api/reels/:id/comments  { text?, imageUrl?, parentId? }
// A comment can be text, an image/GIF, or both. parentId set = a reply.
router.post('/:id/comments', auth.required, async (req, res, next) => {
  try {
    const text = (req.body.text || '').trim();
    const imageUrl = req.body.imageUrl || null;
    if (!text && !imageUrl) return res.status(400).json({ error: 'Add a message or an image' });
    if (text.length > 500) return res.status(400).json({ error: 'Comment too long (max 500 characters)' });

    let parentId = null;
    if (req.body.parentId) {
      const parent = await prisma.reelComment.findUnique({ where: { id: Number(req.body.parentId) } });
      if (!parent) return res.status(404).json({ error: 'Parent comment not found' });
      // one level of nesting: replying to a reply attaches to the same top-level thread
      parentId = parent.parentId || parent.id;
    }
    const comment = await prisma.reelComment.create({
      data: { text, imageUrl, reelId: Number(req.params.id), authorId: req.user.id, parentId },
      include: { author: { select: { id: true, name: true, verification: true, avatarUrl: true } } },
    });
    res.status(201).json({ ...comment, likedByMe: false, replies: [] });
  } catch (err) { next(err); }
});

// POST /api/reels/comments/:commentId/like — toggle a heart on a comment
router.post('/comments/:commentId/like', auth.required, async (req, res, next) => {
  try {
    const commentId = Number(req.params.commentId);
    const userId = req.user.id;
    const existing = await prisma.commentLike.findUnique({ where: { commentId_userId: { commentId, userId } } });
    if (existing) {
      await prisma.commentLike.delete({ where: { id: existing.id } });
      const c = await prisma.reelComment.update({ where: { id: commentId }, data: { likes: { decrement: 1 } } });
      return res.json({ liked: false, likes: c.likes });
    }
    await prisma.commentLike.create({ data: { commentId, userId } });
    const c = await prisma.reelComment.update({ where: { id: commentId }, data: { likes: { increment: 1 } } });
    res.status(201).json({ liked: true, likes: c.likes });
  } catch (err) { next(err); }
});

// DELETE /api/reels/:id — remove my reel (and its comments/likes/saves)
router.delete('/:id', auth.required, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const reel = await prisma.reel.findUnique({ where: { id } });
    if (!reel) return res.status(404).json({ error: 'Reel not found' });
    if (reel.authorId !== req.user.id) return res.status(403).json({ error: 'Not your reel' });
    const commentIds = (await prisma.reelComment.findMany({ where: { reelId: id }, select: { id: true } })).map((c) => c.id);
    await prisma.commentLike.deleteMany({ where: { commentId: { in: commentIds } } });
    await prisma.reelView.deleteMany({ where: { reelId: id } });
    await prisma.reelComment.deleteMany({ where: { reelId: id } });
    await prisma.reelLike.deleteMany({ where: { reelId: id } });
    await prisma.savedReel.deleteMany({ where: { reelId: id } });
    await prisma.reel.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/reels/:id/view — count a view; logged-in views also feed the
// watch history that powers "For You" recommendations.
router.post('/:id/view', auth.optional, async (req, res, next) => {
  try {
    const reelId = Number(req.params.id);
    const reel = await prisma.reel.update({
      where: { id: reelId },
      data: { views: { increment: 1 } },
    });
    if (req.user) {
      await prisma.reelView.create({ data: { reelId, userId: req.user.id } }).catch(() => {});
    }
    res.json({ views: reel.views });
  } catch (err) { next(err); }
});

module.exports = router;
