// Auth middleware: checks the "Authorization: Bearer <token>" header.
// Use `required` on routes that need login; `optional` when login just adds extras.
const jwt = require('jsonwebtoken');

function required(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Login required' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET); // { id, role }
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function optional(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try { req.user = jwt.verify(token, process.env.JWT_SECRET); } catch { /* ignore */ }
  }
  next();
}

// Admin gate: like `required`, but the logged-in account's email must be listed
// in ADMIN_EMAILS in .env (comma-separated). Protects badge approvals and ads.
const prisma = require('../db');
function admin(req, res, next) {
  required(req, res, async () => {
    try {
      const admins = (process.env.ADMIN_EMAILS || '')
        .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
      const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { email: true } });
      if (me && admins.includes(me.email.toLowerCase())) return next();
      res.status(403).json({ error: 'Admin access only' });
    } catch (err) { next(err); }
  });
}

module.exports = { required, optional, admin };
