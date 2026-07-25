// Vetting of a driving licence: reads the uploaded scan (image or PDF), extracts the
// official name, licence number, classes and expiry, and decides VERIFIED / REJECTED.
// Always returns within the time budget (< 31s).
//
// THREE MODES, picked automatically:
//   • 'ai'   — if ANTHROPIC_API_KEY is set: Claude vision reads the licence (most accurate,
//              handles PDFs, private — Anthropic doesn't train on API data). Costs ~<1c/scan.
//   • 'ocr'  — otherwise (the default): Tesseract.js runs OCR ON THIS SERVER for FREE. The
//              licence never leaves your server (best for privacy / Kenya's Data Protection
//              Act). Reads images (JPG/PNG/WEBP); for PDFs it asks for a photo. Lower accuracy
//              on blurry/angled photos than the AI path.
//   • 'demo' — only if OCR is explicitly disabled (DISABLE_OCR=1): vetting is simulated.
//
// PRODUCTION NOTE: OCR/AI extract and sanity-check the fields, but neither PROVES a licence
// is genuine. For real anti-forgery / identity checks, integrate a licensed KYC provider
// (e.g. Smile ID, widely used in Kenya) or an NTSA data check alongside this module.

const fs = require('fs');
const os = require('os');
const path = require('path');

const TIME_BUDGET_MS = 29000; // finish comfortably under the 31s requirement

function isConfigured() {
  return !!process.env.ANTHROPIC_API_KEY; // is the AI (Claude) path available?
}

// Which engine will actually read the licence.
function vettingMode() {
  if (process.env.ANTHROPIC_API_KEY) return 'ai';
  if (process.env.DISABLE_OCR === '1') return 'demo';
  return 'ocr'; // free, on-server OCR is the default
}

// Read the licence scan into a Buffer. Works with both storage modes:
//  • cloud URLs (https://res.cloudinary.com/...) — downloaded
//  • local dev files (/uploads/xxx) — read from disk
async function readUploadBuffer(fileUrl) {
  const cleanUrl = String(fileUrl).split('?')[0];
  const ext = path.extname(cleanUrl).toLowerCase();
  const mime = ext === '.pdf' ? 'application/pdf'
    : ext === '.png' ? 'image/png'
    : ext === '.webp' ? 'image/webp'
    : 'image/jpeg';
  let buffer;
  if (/^https?:\/\//i.test(fileUrl)) {
    const res = await fetch(fileUrl);
    if (!res.ok) throw new Error(`Could not download the licence file (${res.status})`);
    buffer = Buffer.from(await res.arrayBuffer());
  } else {
    const name = cleanUrl.replace(/^\/uploads\//, '');
    buffer = fs.readFileSync(path.join(__dirname, '..', 'uploads', name));
  }
  return { buffer, mime };
}

async function readUpload(fileUrl) {
  const { buffer, mime } = await readUploadBuffer(fileUrl);
  return { base64: buffer.toString('base64'), mime };
}

// ---------------- AI PATH (Claude vision) ----------------
const PROMPT = `You are vetting a Kenyan driving licence for a driver-for-hire marketplace.
Read the document and return ONLY a JSON object (no prose) with these fields:
{
  "isDrivingLicence": boolean,      // is this actually a driving licence?
  "fullName": string,               // the licence holder's full official name, or ""
  "licenceNumber": string,          // licence/ID number, or ""
  "classes": string,                // licence classes e.g. "B,C1,D", or ""
  "expiry": string,                 // expiry date as written, or ""
  "expired": boolean,               // true if the expiry date is in the past
  "legible": boolean,               // is the scan clear enough to read?
  "reason": string                  // short note if you would reject it
}`;

async function extractWithAI(fileUrl) {
  const { base64, mime } = await readUpload(fileUrl);
  const isPdf = mime === 'application/pdf';
  const source = { type: 'base64', media_type: mime, data: base64 };
  const content = [
    { type: isPdf ? 'document' : 'image', source },
    { type: 'text', text: PROMPT },
  ];

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.VET_MODEL || 'claude-haiku-4-5',
      max_tokens: 400,
      messages: [{ role: 'user', content }],
    }),
  });
  if (!res.ok) throw new Error(`Vision API error ${res.status}`);
  const data = await res.json();
  const textOut = (data.content || []).map((c) => c.text).join('');
  const jsonMatch = textOut.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Could not parse licence');
  return JSON.parse(jsonMatch[0]);
}

// ---------------- FREE OCR PATH (Tesseract.js, on this server) ----------------
// A single worker is created lazily and reused; recognitions are serialised so one
// worker handles them one at a time (fine for low/medium traffic). The English data
// (~15MB) is downloaded once and cached to the temp folder.
let _workerPromise = null;
async function getWorker() {
  if (_workerPromise) return _workerPromise;
  const { createWorker } = require('tesseract.js');
  _workerPromise = createWorker('eng', 1, { cachePath: os.tmpdir() })
    .catch((err) => { _workerPromise = null; throw err; });
  return _workerPromise;
}

let _ocrQueue = Promise.resolve();
function ocrText(buffer) {
  const run = _ocrQueue.then(async () => {
    const worker = await getWorker();
    const { data } = await worker.recognize(buffer);
    return data.text || '';
  });
  _ocrQueue = run.then(() => {}, () => {}); // keep the chain alive after errors
  return run;
}

// Turn messy OCR text into the same fields the AI path returns.
function parseLicenceText(raw) {
  const text = String(raw || '');
  const upperCompact = text.toUpperCase().replace(/\s+/g, ' ');
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);

  const KEYWORDS = ['DRIVING LICENCE', 'DRIVING LICENSE', "DRIVER'S LICENCE", 'DRIVERS LICENCE',
    'NATIONAL TRANSPORT', 'NTSA', 'REPUBLIC OF KENYA'];
  const hasKeyword = KEYWORDS.some((k) => upperCompact.includes(k));

  // Licence / ID number: a 6–10 digit run.
  const numMatch = upperCompact.match(/\b(\d{6,10})\b/);
  const licenceNumber = numMatch ? numMatch[1] : '';

  // Classes: a line mentioning CLASS, capture following codes.
  let classes = '';
  const classLine = lines.find((l) => /CLASS/i.test(l));
  if (classLine) {
    const m = classLine.toUpperCase().match(/CLASS[^A-Z0-9]*([A-Z0-9,\/\s]+)/);
    if (m) classes = m[1].trim().replace(/\s+/g, ',').replace(/[^A-Z0-9,\/]/g, '').replace(/,+/g, ',').slice(0, 20);
  }

  // Dates: dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy. Latest = expiry.
  const dates = [];
  const dateRe = /(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/g;
  let dm;
  while ((dm = dateRe.exec(text)) !== null) {
    let [full, d, mo, y] = dm;
    if (y.length === 2) y = '20' + y;
    const dt = new Date(Number(y), Number(mo) - 1, Number(d));
    if (!isNaN(dt) && dt.getFullYear() > 1990 && dt.getFullYear() < 2100) dates.push({ full, dt });
  }
  let expiry = '';
  let expired = false;
  if (dates.length) {
    dates.sort((a, b) => a.dt - b.dt);
    const latest = dates[dates.length - 1];
    expiry = latest.full;
    expired = latest.dt < new Date();
  }

  // Name: the most prominent line of 2–4 alphabetic words that isn't a header/label.
  const STOP = /KENYA|LICENCE|LICENSE|TRANSPORT|SAFETY|AUTHORITY|CLASS|DATE|BIRTH|ISSUE|EXPIR|VALID|NATIONAL|REPUBLIC|DRIVING|SIGNATURE|NAIROBI|GENDER|BLOOD|DONOR|NUMBER/;
  const nameCandidates = lines
    .map((l) => l.replace(/[^A-Za-z\s]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((l) => {
      const words = l.split(' ').filter(Boolean);
      if (words.length < 2 || words.length > 4) return false;
      if (STOP.test(l.toUpperCase())) return false;
      return l.length >= 6;
    })
    .sort((a, b) => b.length - a.length);
  const fullName = nameCandidates[0] ? nameCandidates[0].replace(/\s+/g, ' ').trim() : '';

  const alnumCount = upperCompact.replace(/[^A-Z0-9]/g, '').length;
  const legible = alnumCount >= 25; // enough text was recognised
  const isDrivingLicence = hasKeyword || (!!licenceNumber && !!fullName);

  return {
    isDrivingLicence,
    fullName,
    licenceNumber,
    classes,
    expiry,
    expired,
    legible,
    reason: !isDrivingLicence ? "Could not confirm this photo is a driving licence — please upload a clear, flat photo of the front."
      : !legible ? 'The photo is too blurry to read — please retake it in good light.'
      : !fullName ? 'Could not read the name — please upload a sharper, flat photo.'
      : '',
  };
}

async function extractWithOCR(fileUrl) {
  const { buffer, mime } = await readUploadBuffer(fileUrl);
  if (mime === 'application/pdf') {
    // Tesseract can't read PDFs directly. Ask for a photo instead.
    return {
      isDrivingLicence: false, fullName: '', licenceNumber: '', classes: '',
      expiry: '', expired: false, legible: false,
      reason: 'We received a PDF. Automatic reading works on a PHOTO — please upload a clear JPG/PNG picture of your licence.',
    };
  }
  const text = await ocrText(buffer);
  return parseLicenceText(text);
}

// ---------------- DECISION ----------------
function decide(x, source) {
  if (!x.isDrivingLicence) return { vetStatus: 'REJECTED', notes: x.reason || 'Not a valid driving licence.' };
  if (!x.legible) return { vetStatus: 'REJECTED', notes: x.reason || 'The scan is not clear enough — please upload a sharper copy.' };
  if (!x.fullName) return { vetStatus: 'REJECTED', notes: x.reason || 'Could not read the name on the licence.' };
  if (x.expired) return { vetStatus: 'REJECTED', notes: 'This licence appears to be expired.' };
  return {
    vetStatus: 'VERIFIED',
    licenseName: x.fullName,
    licenseNumber: x.licenceNumber || null,
    licenseClasses: x.classes || null,
    licenseExpiry: x.expiry || null,
    notes: source === 'ocr' ? 'Licence read automatically (on-server OCR).' : 'Licence verified by AI review.',
  };
}

// ---------------- MAIN ENTRY ----------------
// Always resolves within TIME_BUDGET_MS.
async function vetLicense({ fileUrl, typedName }) {
  const started = Date.now();
  const mode = vettingMode();

  const run = (async () => {
    if (mode === 'ai') {
      return decide(await extractWithAI(fileUrl), 'ai');
    }
    if (mode === 'ocr') {
      try {
        return decide(await extractWithOCR(fileUrl), 'ocr');
      } catch (err) {
        // OCR engine couldn't load/run — never break the flow.
        return { vetStatus: 'PENDING', notes: 'Automatic reading is temporarily unavailable — please try again in a moment.' };
      }
    }
    // DEMO mode (OCR explicitly disabled)
    await new Promise((r) => setTimeout(r, 2000));
    return {
      vetStatus: 'VERIFIED',
      licenseName: (typedName || 'Demo Driver').trim(),
      licenseNumber: 'DEMO-' + Math.floor(100000 + Math.random() * 900000),
      licenseClasses: null,
      licenseExpiry: null,
      notes: 'DEMO MODE: vetting simulated.',
      demo: true,
    };
  })();

  const timeout = new Promise((resolve) =>
    setTimeout(() => resolve({ vetStatus: 'PENDING', notes: 'Vetting is taking longer than expected — please try again.' }),
      TIME_BUDGET_MS));

  const result = await Promise.race([run, timeout]);
  result.tookMs = Date.now() - started;
  return result;
}

module.exports = { vetLicense, isConfigured, vettingMode, parseLicenceText };
