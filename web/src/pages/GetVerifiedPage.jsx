// Paid verification: pick Individual (KES 300/yr) or Business (KES 1000/yr),
// pay via M-Pesa STK push or card, badge is granted automatically on payment.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getToken, getUser, updateStoredUser } from '../api/client';

export default function GetVerifiedPage() {
  const [plans, setPlans] = useState([]);
  const [meta, setMeta] = useState({});
  const [purpose, setPurpose] = useState('VERIFICATION_INDIVIDUAL');
  const [phone, setPhone] = useState('');
  const [stage, setStage] = useState('choose'); // choose | waiting | done
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const pollRef = useRef(null);

  useEffect(() => {
    if (!getToken()) { navigate('/login'); return; }
    const u = getUser();
    if (u) setPhone(u.phone || '');
    api('/api/payments/plans').then((d) => { setPlans(d.plans); setMeta(d); }).catch((e) => setError(e.message));
    return () => clearInterval(pollRef.current);
  }, []);

  const plan = plans.find((p) => p.id === purpose);

  function pollStatus(paymentId) {
    pollRef.current = setInterval(async () => {
      try {
        const s = await api(`/api/payments/${paymentId}/status`);
        if (s.status === 'COMPLETED') {
          clearInterval(pollRef.current);
          const me = await api('/api/auth/me'); // refresh badge
          updateStoredUser(me);
          setStage('done');
        } else if (s.status === 'FAILED') {
          clearInterval(pollRef.current);
          setError('Payment was cancelled or failed. Please try again.');
          setStage('choose');
        }
      } catch { /* keep polling */ }
    }, 2500);
  }

  async function payMpesa() {
    setError('');
    if (!phone) return setError('Enter your M-Pesa phone number');
    try {
      const r = await api('/api/payments/verification/mpesa', { method: 'POST', body: { purpose, phone } });
      setNote(r.message);
      setStage('waiting');
      pollStatus(r.paymentId);
    } catch (e) { setError(e.message); }
  }

  async function payCard() {
    setError('');
    try {
      const r = await api('/api/payments/verification/card', { method: 'POST', body: { purpose } });
      setNote(r.message || 'Redirecting to secure card checkout…');
      setStage('waiting');
      if (r.checkoutUrl) { window.location.href = r.checkoutUrl; return; } // real gateway
      pollStatus(r.paymentId); // simulate mode
    } catch (e) { setError(e.message); }
  }

  if (stage === 'done') {
    return (
      <div className="page narrow">
        <div className="verify-done">
          <div className="verify-check">✓</div>
          <h1>You're verified! 🎉</h1>
          <p>Your <b>{plan?.badge === 'DEALER_VERIFIED' ? 'Verified Dealer' : 'ID Verified'}</b> badge is now active
             and shows on all your listings, reels and profile for one year.</p>
          <button className="btn" onClick={() => navigate('/profile')}>Go to my profile</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page narrow">
      <h1>Get Verified ✔</h1>
      <p className="meta">
        Verified accounts earn buyer trust, rank higher in search, and show a badge on every
        listing, reel and comment. Choose your plan:
      </p>

      <div className="plan-grid">
        {plans.map((p) => (
          <button key={p.id} className={`plan-card ${purpose === p.id ? 'on' : ''}`} onClick={() => setPurpose(p.id)}>
            <span className="plan-title">{p.id === 'VERIFICATION_BUSINESS' ? '🏢 Business' : '🧍 Individual'}</span>
            <span className="plan-price">KES {p.amountKes.toLocaleString()}<small>/year</small></span>
            <span className="badge {p.badge}">
              {p.badge === 'DEALER_VERIFIED' ? '✔ Verified Dealer' : '✔ ID Verified'}
            </span>
            <span className="meta">{p.id === 'VERIFICATION_BUSINESS'
              ? 'For dealers, garages & registered companies'
              : 'For private sellers & drivers'}</span>
          </button>
        ))}
      </div>

      {stage === 'waiting' ? (
        <div className="card pay-waiting">
          <div className="spinner" />
          <p>{note}</p>
          <p className="meta">Waiting for payment confirmation… this updates automatically.</p>
        </div>
      ) : (
        <div className="card">
          <h3>Pay KES {plan?.amountKes.toLocaleString()} for {plan?.id === 'VERIFICATION_BUSINESS' ? 'Business' : 'Individual'} verification</h3>

          <label className="pay-label">M-Pesa number</label>
          <input className="pay-input" placeholder="07XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <button className="btn pay-mpesa" onClick={payMpesa}>📲 Pay with M-Pesa</button>
          <button className="btn secondary pay-card" onClick={payCard}>💳 Pay with Card</button>

          {!meta.mpesaLive && (
            <p className="demo-note">⚙️ Demo mode — no real charge. Payment is simulated so you can see the badge
               appear. Add Safaricom/Flutterwave keys in <code>.env</code> to take real money.</p>
          )}
          {meta.paybill && <p className="meta">Paybill: <b>{meta.paybill}</b></p>}
          {error && <p className="error">{error}</p>}
        </div>
      )}
    </div>
  );
}
