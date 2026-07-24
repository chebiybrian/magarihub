// Real file uploads: photos (listings/parts), videos (reels) and licence scans.
//
// TWO MODES, picked automatically:
//  • CLOUD (production) — when CLOUDINARY_URL is set in .env, files are stored on
//    Cloudinary's free CDN and we return permanent https URLs. This is required on
//    Render, whose disk is wiped every time the server restarts or sleeps.
//  • DISK (local dev) — otherwise files are saved to backend/uploads/ and served
//    at /uploads/<name>, exactly like before.
const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');
const auth = require('../middleware/auth');

const CLOUD = !!process.env.CLOUDINARY_URL;
let cloudinary = null;
if (CLOUD) {
  cloudinary = require('cloudinary').v2; // reads CLOUDINARY_URL from .env automatically
  cloudinary.config({ secure: true });
}

// In cloud mode files only land in the system temp folder for a moment,
// then move to Cloudinary and the temp copy is deleted.
const UPLOAD_DIR = CLOUD ? os.tmpdir() : path.join(__dirname, '..', '..', 'uploads');
if (!CLOUD) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  // unique name: timestamp + random hex + original extension
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
  },
});

const ALLOWED = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.mov', '.webm', '.m4v', '.pdf'];
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024, files: 12 }, // 100 MB per file (Cloudinary free's video cap), max 12 files
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED.includes(ext)) cb(null, true);
    else cb(new Error(`File type ${ext} not allowed. Use photos (jpg/png/webp) or videos (mp4/mov/webm).`));
  },
});

// Send one temp file to Cloudinary. resource_type "auto" figures out whether it's
// an image, a video or a PDF. Videos use the chunked uploader so large files work.
const VIDEO_EXT = ['.mp4', '.mov', '.webm', '.m4v'];
function toCloud(file) {
  return new Promise((resolve, reject) => {
    const ext = path.extname(file.filename).toLowerCase();
    const opts = { resource_type: 'auto', folder: 'magarihub' };
    const done = (err, result) => {
      fs.unlink(file.path, () => {}); // remove the temp copy either way
      if (err || !result?.secure_url) reject(err || new Error('Cloud upload failed'));
      else resolve(result.secure_url);
    };
    if (VIDEO_EXT.includes(ext)) {
      cloudinary.uploader.upload_large(file.path, { ...opts, chunk_size: 20 * 1024 * 1024 }, done);
    } else {
      cloudinary.uploader.upload(file.path, opts, done);
    }
  });
}

// POST /api/upload — multipart form-data, field name "files"
// Returns { urls: [...] } — https URLs in cloud mode, "/uploads/..." paths in dev.
router.post('/', auth.required, upload.array('files', 12), async (req, res, next) => {
  try {
    const files = req.files || [];
    if (!CLOUD) {
      return res.status(201).json({ urls: files.map((f) => `/uploads/${f.filename}`) });
    }
    const urls = await Promise.all(files.map(toCloud));
    res.status(201).json({ urls });
  } catch (err) { next(err); }
});

module.exports = router;
