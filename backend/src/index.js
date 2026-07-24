// MagariHub API server.
// Start with: npm run dev  (auto-restarts on file changes)
// Features: listings, reels + For You recommendations, followers/following,
// drivers, insurance, guides, parts, ads, uploads.
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors()); // allow web + mobile apps to call this API
app.use(express.json());

// Uploaded photos/videos are served from here, e.g. http://localhost:4000/uploads/abc.jpg
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health check — visit http://localhost:4000 to confirm the server is up
app.get('/', (req, res) => res.json({ ok: true, name: 'MagariHub API', version: 1 }));

// Feature routes (one file per feature in src/routes/)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/listings', require('./routes/listings'));
app.use('/api/reels', require('./routes/reels'));
app.use('/api/drivers', require('./routes/drivers'));
app.use('/api/insurance', require('./routes/insurance'));
app.use('/api/guides', require('./routes/guides'));
app.use('/api/parts', require('./routes/parts'));
app.use('/api/users', require('./routes/users'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/ads', require('./routes/ads'));
app.use('/api/aggregate', require('./routes/aggregate'));
app.use('/api/market', require('./routes/market'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/metasearch', require('./routes/metasearch'));

// Central error handler — any route that calls next(err) lands here
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`MagariHub API running on http://localhost:${PORT}`));
