// AI vetting of a driving licence: reads the uploaded scan (image or PDF),
// extracts the official name, licence number, classes and expiry, and decides
// VERIFIED / REJECTED. Must return within the time budget (< 31s).
//
// TO GO LIVE (real extraction): set ANTHROPIC_API_KEY in .env. The scan is sent to
// Claude's vision/document API which reads the licence and returns structured JSON.
// Without a key the app runs in DEMO mode: it simulates the ~3s vetting so you can
// see the full flow, using the name the applicant typed.
//
// PRODUCTION NOTE: AI OCR extracts and sanity-checks fields, but it does NOT prove a
// licence is genuine. For real anti-forgery / identity checks, integrate a licensed
// KYC provider (e.g. Smile ID, widely used in Kenya) or an NTSA data check. This module
// is structured so that verification step can slot in alongside the extraction.

const fs = require('fs');
const path = require('path');

const TIME_BUDGET_MS = 29000; // finish comfortably under the 31s requirement

function isConfigured() {
  return !!process.env.ANTHROPIC_API_KEY;
}

// Read the licence scan as base64. Works with both storage modes:
//  • cloud URLs (https://res.cloudinary.com/...) — downloaded
//  • local dev files (/uploads/xxx) — read from disk
async function readUpload(fileUrl) {
  const cleanUrl = String(fileUrl).split('?')[0];
  const ext = path.extname(cleanUrl).toLowerCase();
  const mime = ext === '.pdf' ? 'application/pdf'
    : ext === '.png' ? 'image/png'
    : ext === '.webp' ? 'image/webp'
    : 'image/jpeg';
  let buf;
  if (/^https?:\/\//i.test(fileUrl)) {
    const res = await fetch(fileUrl);
    if (!res.ok) throw new Error(`Could not download the licence file (${res.status})`);
    buf = Buffer.from(await res.arrayBuffer());
  } else {
    const name = cleanUrl.replace(/^\/uploads\//, '');
    buf = fs.readFileSync(path.join(__dirname, '..', 'uploads', name));
  }
  return { base64: buf.toString('base64'), mime };
}

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

// Call Claude vision with the document. Returns parsed JSON.
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

// Turn the extracted fields into a decision.
function decide(x) {
  if (!x.isDrivingLicence) return { vetStatus: 'REJECTED', notes: x.reason || 'Not a valid driving licence.' };
  if (!x.legible) return { vetStatus: 'REJECTED', notes: 'The scan is not clear enough — please upload a sharper copy.' };
  if (!x.fullName) return { vetStatus: 'REJECTED', notes: 'Could not read the name on the licence.' };
  if (x.expired) return { vetStatus: 'REJECTED', notes: 'This licence appears to be expired.' };
  return {
    vetStatus: 'VERIFIED',
    licenseName: x.fullName,
    licenseNumber: x.licenceNumber || null,
    licenseClasses: x.classes || null,
    licenseExpiry: x.expiry || null,
    notes: 'Licence verified by AI review.',
  };
}

// Main entry. Always resolves within TIME_BUDGET_MS.
async function vetLicense({ fileUrl, typedName }) {
  const started = Date.now();
  const run = (async () => {
    if (isConfigured()) {
      const extracted = await extractWithAI(fileUrl);
      return decide(extracted);
    }
    // DEMO mode: simulate a quick AI review (no key configured)
    await new Promise((r) => setTimeout(r, 2500));
    return {
      vetStatus: 'VERIFIED',
      licenseName: (typedName || 'Demo Driver').trim(),
      licenseNumber: 'DEMO-' + Math.floor(100000 + Math.random() * 900000),
      licenseClasses: null,
      licenseExpiry: null,
      notes: 'DEMO MODE: vetting simulated (no AI key). Add ANTHROPIC_API_KEY for real licence reading.',
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

module.exports = { vetLicense, isConfigured };
