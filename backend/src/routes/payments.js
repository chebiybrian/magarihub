// Payments: paid verification badges via M-Pesa (Daraja STK Push) or card (Flutterwave).
// Payment is auto-detected (M-Pesa callback / card webhook) and the badge is granted immediately.
// SIMULATE mode lets you test the full flow on localhost without real credentials.
const router = require('express').Router();
const prisma = require('../db');
const auth = require('../middleware/auth');
const mpesa = require('../mpesa');

// Pricing
const PLANS = {
  VERIFICATION_INDIVIDUAL: { amountKes: 300, badge: 'ID_VERIFIED', label: 'Individual — ID Verified' },
  VERIFICATION_BUSINESS: { amountKes: 1000, badge: 'DEALER_VERIFIED', label: 'Business — Verified Dealer' },
};

// Called when ANY payment succeeds. Branches on purpose:
//  - verification  -> grant the badge (+1 year)
//  - tip / donation -> just record it as completed
async function completePayment(payment, mpesaReceipt = null) {
  if (payment.status === 'COMPLETED') return;
  const plan = PLANS[payment.purpose];
  if (plan) {
    // verification badge
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);
    await prisma.$transaction([
      prisma.payment.update({ where: { id: payment.id }, data: { status: 'COMPLETED', completedAt: new Date(), mpesaReceipt } }),
      prisma.user.update({ where: { id: payment.userId }, data: { verification: plan.badge, verificationExpiry: expiry } }),
    ]);
  } else {
    // tip or donation — nothing to grant, just mark complete
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'COMPLETED', completedAt: new Date(), mpesaReceipt } });
  }
}
// Back-compat alias
const grantBadge = completePayment;

// GET /api/payments/plans — prices for the UI
router.get('/plans', (req, res) => {
  res.json({
    plans: [
      { id: 'VERIFICATION_INDIVIDUAL', ...PLANS.VERIFICATION_INDIVIDUAL },
      { id: 'VERIFICATION_BUSINESS', ...PLANS.VERIFICATION_BUSINESS },
    ],
    mpesaLive: mpesa.isConfigured(),
    paybill: process.env.MPESA_SHORTCODE || null,
  });
});

// POST /api/payments/verification/mpesa  { purpose, phone }
// Starts an STK push (or simulates one), returns a paymentId to poll.
router.post('/verification/mpesa', auth.required, async (req, res, next) => {
  try {
    const { purpose, phone } = req.body;
    const plan = PLANS[purpose];
    if (!plan) return res.status(400).json({ error: 'Invalid plan' });
    if (!phone) return res.status(400).json({ error: 'M-Pesa phone number is required' });

    const payment = await prisma.payment.create({
      data: { userId: req.user.id, amountKes: plan.amountKes, method: 'MPESA', purpose, phone: mpesa.normalizePhone(phone) },
    });

    if (mpesa.isConfigured()) {
      // REAL: trigger the PIN prompt on the customer's phone
      const { checkoutRequestId } = await mpesa.stkPush({
        phone, amount: plan.amountKes,
        accountRef: `MAGARI-${payment.id}`,
        description: `MagariHub ${plan.label}`,
      });
      await prisma.payment.update({ where: { id: payment.id }, data: { providerRef: checkoutRequestId } });
      return res.json({ paymentId: payment.id, mode: 'live', message: 'Check your phone and enter your M-Pesa PIN.' });
    }

    // SIMULATE: auto-complete after a short delay so you can see the badge appear
    setTimeout(() => grantBadge(payment, 'SIMULATED').catch(() => {}), 4000);
    res.json({
      paymentId: payment.id, mode: 'simulate',
      message: 'DEMO MODE: no real charge. Badge will be granted in a few seconds.',
    });
  } catch (err) { next(err); }
});

// POST /api/payments/mpesa/callback — Safaricom calls this when the customer pays (or cancels).
// Public (no auth) — Safaricom's servers hit it directly.
router.post('/mpesa/callback', async (req, res) => {
  // Always 200 quickly so Safaricom doesn't retry
  res.json({ ResultCode: 0, ResultDesc: 'Received' });
  try {
    const cb = req.body?.Body?.stkCallback;
    if (!cb) return;
    const payment = await prisma.payment.findFirst({ where: { providerRef: cb.CheckoutRequestID } });
    if (!payment || payment.status === 'COMPLETED') return;

    if (cb.ResultCode === 0) {
      const items = cb.CallbackMetadata?.Item || [];
      const receipt = items.find((i) => i.Name === 'MpesaReceiptNumber')?.Value || null;
      await completePayment(payment, receipt);
    } else {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
    }
  } catch (e) { console.error('M-Pesa callback error', e); }
});

// POST /api/payments/verification/card  { purpose }
// Returns a Flutterwave checkout URL (real when FLUTTERWAVE_* env keys are set), else simulates.
router.post('/verification/card', auth.required, async (req, res, next) => {
  try {
    const plan = PLANS[req.body.purpose];
    if (!plan) return res.status(400).json({ error: 'Invalid plan' });
    const payment = await prisma.payment.create({
      data: { userId: req.user.id, amountKes: plan.amountKes, method: 'CARD', purpose: req.body.purpose },
    });

    if (process.env.FLUTTERWAVE_SECRET_KEY) {
      const txRef = `MAGARI-CARD-${payment.id}`;
      const me = await prisma.user.findUnique({ where: { id: req.user.id } });
      const resp = await fetch('https://api.flutterwave.com/v3/payments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tx_ref: txRef, amount: plan.amountKes, currency: 'KES',
          redirect_url: `${process.env.PUBLIC_WEB_URL || 'http://localhost:5173'}/profile`,
          customer: { email: me.email, name: me.name },
          customizations: { title: 'MagariHub Verification', description: plan.label },
        }),
      });
      const data = await resp.json();
      await prisma.payment.update({ where: { id: payment.id }, data: { providerRef: txRef } });
      if (data.status === 'success') return res.json({ paymentId: payment.id, mode: 'live', checkoutUrl: data.data.link });
      return res.status(502).json({ error: 'Card gateway error' });
    }

    // SIMULATE
    setTimeout(() => grantBadge(payment, 'SIMULATED-CARD').catch(() => {}), 4000);
    res.json({ paymentId: payment.id, mode: 'simulate', message: 'DEMO MODE: simulating card payment…' });
  } catch (err) { next(err); }
});

// POST /api/payments/contribute — tip a creator (recipientId set) or donate to the platform.
// Body: { amountKes, method: 'MPESA'|'CARD', phone?, recipientId?, message? }
router.post('/contribute', auth.required, async (req, res, next) => {
  try {
    const amount = Math.round(Number(req.body.amountKes));
    const { method, phone, recipientId, message } = req.body;
    if (!amount || amount < 10) return res.status(400).json({ error: 'Minimum contribution is KES 10' });
    if (amount > 1000000) return res.status(400).json({ error: 'Amount too large' });

    let recipient = null;
    if (recipientId) {
      recipient = await prisma.user.findUnique({ where: { id: Number(recipientId) } });
      if (!recipient) return res.status(404).json({ error: 'Recipient not found' });
      if (recipient.id === req.user.id) return res.status(400).json({ error: "You can't tip yourself" });
    }
    const purpose = recipientId ? 'TIP_CREATOR' : 'DONATION_PLATFORM';

    const payment = await prisma.payment.create({
      data: {
        userId: req.user.id, recipientId: recipientId ? Number(recipientId) : null,
        amountKes: amount, method: method === 'CARD' ? 'CARD' : 'MPESA', purpose,
        message: message ? String(message).slice(0, 200) : null,
        phone: phone ? mpesa.normalizePhone(phone) : null,
      },
    });

    // CARD path
    if (method === 'CARD') {
      if (process.env.FLUTTERWAVE_SECRET_KEY) {
        const txRef = `MAGARI-GIFT-${payment.id}`;
        const me = await prisma.user.findUnique({ where: { id: req.user.id } });
        const resp = await fetch('https://api.flutterwave.com/v3/payments', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tx_ref: txRef, amount, currency: 'KES',
            redirect_url: `${process.env.PUBLIC_WEB_URL || 'http://localhost:5173'}/`,
            customer: { email: me.email, name: me.name },
            customizations: { title: 'MagariHub', description: recipientId ? `Gift to ${recipient.name}` : 'Support MagariHub' },
          }),
        });
        const data = await resp.json();
        await prisma.payment.update({ where: { id: payment.id }, data: { providerRef: txRef } });
        if (data.status === 'success') return res.json({ paymentId: payment.id, mode: 'live', checkoutUrl: data.data.link });
        return res.status(502).json({ error: 'Card gateway error' });
      }
      setTimeout(() => completePayment(payment, 'SIMULATED-CARD').catch(() => {}), 4000);
      return res.json({ paymentId: payment.id, mode: 'simulate', message: 'DEMO MODE: simulating card gift…' });
    }

    // M-PESA path
    if (!phone) return res.status(400).json({ error: 'M-Pesa phone number is required' });
    if (mpesa.isConfigured()) {
      const { checkoutRequestId } = await mpesa.stkPush({
        phone, amount, accountRef: `MAGARI-${payment.id}`,
        description: recipientId ? `Gift to ${recipient.name}` : 'Support MagariHub',
      });
      await prisma.payment.update({ where: { id: payment.id }, data: { providerRef: checkoutRequestId } });
      return res.json({ paymentId: payment.id, mode: 'live', message: 'Check your phone and enter your M-Pesa PIN.' });
    }
    setTimeout(() => completePayment(payment, 'SIMULATED').catch(() => {}), 4000);
    res.json({ paymentId: payment.id, mode: 'simulate', message: 'DEMO MODE: no real charge. Confirming shortly…' });
  } catch (err) { next(err); }
});

// GET /api/payments/tips/received — gifts sent to me (for creators)
router.get('/tips/received', auth.required, async (req, res, next) => {
  try {
    const tips = await prisma.payment.findMany({
      where: { recipientId: req.user.id, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      include: { user: { select: { id: true, name: true, avatarUrl: true, verification: true } } },
    });
    const total = tips.reduce((s, t) => s + t.amountKes, 0);
    res.json({ total, count: tips.length, tips });
  } catch (err) { next(err); }
});

// GET /api/payments/:id/status — the frontend polls this until COMPLETED
router.get('/:id/status', auth.required, async (req, res, next) => {
  try {
    const payment = await prisma.payment.findUnique({ where: { id: Number(req.params.id) } });
    if (!payment || payment.userId !== req.user.id) return res.status(404).json({ error: 'Payment not found' });
    res.json({ status: payment.status, purpose: payment.purpose, amountKes: payment.amountKes });
  } catch (err) { next(err); }
});

// GET /api/payments/mine — my payment history (receipts)
router.get('/mine', auth.required, async (req, res, next) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(payments);
  } catch (err) { next(err); }
});

module.exports = router;
