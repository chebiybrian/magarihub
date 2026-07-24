// M-Pesa Daraja (STK Push) helper.
//
// TO GO LIVE: create an app at https://developer.safaricom.co.ke, then set in .env:
//   MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET
//   MPESA_SHORTCODE   (your Paybill/Till number)
//   MPESA_PASSKEY     (Lipa na M-Pesa Online passkey)
//   MPESA_CALLBACK_URL  (a PUBLIC https URL, e.g. https://xxxx.ngrok.io/api/payments/mpesa/callback)
//   MPESA_ENV = "sandbox" or "production"
//
// If these are not set, isConfigured() returns false and the app uses SIMULATE mode
// so you can test the whole pay -> badge flow on localhost without real credentials.

const BASE = () =>
  (process.env.MPESA_ENV === 'production')
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';

function isConfigured() {
  return !!(process.env.MPESA_CONSUMER_KEY && process.env.MPESA_CONSUMER_SECRET &&
            process.env.MPESA_SHORTCODE && process.env.MPESA_PASSKEY && process.env.MPESA_CALLBACK_URL);
}

// Normalize 07xxxxxxxx / +2547xxxxxxxx / 2547xxxxxxxx -> 2547xxxxxxxx
function normalizePhone(phone) {
  let p = String(phone).replace(/\D/g, '');
  if (p.startsWith('0')) p = '254' + p.slice(1);
  if (p.startsWith('7') || p.startsWith('1')) p = '254' + p;
  if (p.startsWith('254')) return p;
  return p;
}

async function getAccessToken() {
  const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
  const res = await fetch(`${BASE()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error('M-Pesa auth failed');
  const data = await res.json();
  return data.access_token;
}

// Trigger the STK push (the customer's phone shows the PIN prompt).
// Returns { checkoutRequestId } used to match the async callback later.
async function stkPush({ phone, amount, accountRef, description }) {
  const token = await getAccessToken();
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const shortcode = process.env.MPESA_SHORTCODE;
  const password = Buffer.from(`${shortcode}${process.env.MPESA_PASSKEY}${timestamp}`).toString('base64');

  const res = await fetch(`${BASE()}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: normalizePhone(phone),
      PartyB: shortcode,
      PhoneNumber: normalizePhone(phone),
      CallBackURL: process.env.MPESA_CALLBACK_URL,
      AccountReference: accountRef,
      TransactionDesc: description,
    }),
  });
  const data = await res.json();
  if (data.ResponseCode !== '0') {
    throw new Error(data.errorMessage || data.ResponseDescription || 'STK push failed');
  }
  return { checkoutRequestId: data.CheckoutRequestID };
}

module.exports = { isConfigured, normalizePhone, stkPush };
