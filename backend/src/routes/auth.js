// Register, login, and "who am I" endpoints.
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db');
const auth = require('../middleware/auth');

// Never send the password hash to clients
function publicUser(u) {
  const { passwordHash, ...safe } = u;
  return safe;
}

function makeToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

// POST /api/auth/register  { name, email, password, phone?, role?, county? }
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, phone, role, county } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: 'Email already registered' });

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        county,
        role: ['BUYER', 'SELLER', 'DEALER', 'DRIVER'].includes(role) ? role : 'BUYER',
        passwordHash: await bcrypt.hash(password, 10),
      },
    });
    res.status(201).json({ token: makeToken(user), user: publicUser(user) });
  } catch (err) { next(err); }
});

// POST /api/auth/login  { email, password }
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) {
      return res.status(401).json({ error: 'Wrong email or password' });
    }
    res.json({ token: makeToken(user), user: publicUser(user) });
  } catch (err) { next(err); }
});

// GET /api/auth/me — current logged-in user (with follower counts)
router.get('/me', auth.required, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { _count: { select: { followers: true, following: true } } },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { _count, ...rest } = user;
    res.json({ ...publicUser(rest), followersCount: _count.followers, followingCount: _count.following });
  } catch (err) { next(err); }
});

module.exports = router;
