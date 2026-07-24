// Reusable "contribute" popup — used to tip a creator (pass recipient)
// or support MagariHub (no recipient). Pay any amount via M-Pesa or card.
import { useEffect, useRef, useState } from 'react';
import { api, getToken, getUser } from '../api/client';

const PRESETS = [50, 100, 200, 500, 1000];

export default function ContributeModal({ recipient, onClose }) {
  // recipient = { id, name } to tip a creator; omit for a platform donation
  const [amount, setAmount] = useState(100);
  const [custom, setCustom] = useState('');
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [stage, setStage] = useState('choose'); // choose | waiting | done
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const pollRef = useRef(null);

  useEffect(() => {
    const u = getUser();
    if (u?.phone) setPhone(u.phone);
    return () => clearInterval(pollRef.current);
  }, []);

  const finalAmount = custom ? Number(custom) : amount;
  const title = recipient ? `Gift @${recipient.name}` : 'Support MagariHub ❤️';

  function poll(id) {
    pollRef.current = setInterval(async () => {
      try {
        const s = await api(`/api/payments/${id}/status`);
        if (s.status === 'COMPLETED') { clearInterval(pollRef.current); setStage('done'); }
        else if (s.status === 'FAILED') { clearInterval(pollRef.current); setError('Payment failed or cancelled.'); setStage('choose'); }
      } catch { /* keep polling */ }
    }, 2500);
  }

  async function pay(method) {
    setError('');
    if (!getToken()) { setError('Please log in first to contribute.'); return; }
    if (!finalAmount || finalAmount < 10) { setError('Enter at least KES 10.'); return; }
    if (method === 'MPESA' && !phone) { setError('Enter your M-Pesa number.'); return; }
    try {
      const r = await api('/api/payments/contribute', {
        method: 'POST',
        body: { amountKes: finalAmount, method, phone, message, recipientId: recipient?.id },
      });
      setNote(r.message);
      setStage('waiting');
      if (r.checkoutUrl) { window.location.href = r.checkoutUrl; return; }
      poll(r.paymentId);
    } catch (e) { setError(e.message); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        {stage === 'done' ? (
          <div className="verify-done" style={{ padding: 10 }}>
            <div className="verify-check">♥</div>
            <h2>{recipient ? 'Gift sent! 🎉' : 'Thank you! 🎉'}</h2>
            <p className="meta">
              {recipient
                ? `@${recipient.name} will receive your KES ${finalAmount.toLocaleString()} tip.`
                : `Your KES ${finalAmount.toLocaleString()} keeps MagariHub running. Asante sana!`}
            </p>
            <button className="btn" onClick={onClose}>Done</button>
          </div>
        ) : stage === 'waiting' ? (
          <div className="pay-waiting">
            <div className="spinner" />
            <p>{note}</p>
            <p className="meta">Waiting for confirmation…</p>
          </div>
        ) : (
          <>
            <h2>{title}</h2>
            <p className="meta">
              {recipient ? 'Send a gift to show appreciation for their content.' : 'Contribute any amount to help keep MagariHub free and growing.'}
            </p>

            <div className="amount-chips">
              {PRESETS.map((v) => (
                <button key={v} className={`chip ${!custom && amount === v ? 'on' : ''}`}
                  onClick={() => { setAmount(v); setCustom(''); }}>
                  KES {v.toLocaleString()}
                </button>
              ))}
              <input className="amount-custom" type="number" placeholder="Custom" value={custom}
                onChange={(e) => setCustom(e.target.value)} />
            </div>

            <input className="pay-input" placeholder="Add a message (optional)" value={message}
              onChange={(e) => setMessage(e.target.value)} maxLength={200} />
            <input className="pay-input" placeholder="M-Pesa number (07XX XXX XXX)" value={phone}
              onChange={(e) => setPhone(e.target.value)} />

            <button className="btn pay-mpesa" onClick={() => pay('MPESA')}>
              📲 Give KES {(finalAmount || 0).toLocaleString()} via M-Pesa
            </button>
            <button className="btn secondary pay-card" onClick={() => pay('CARD')}>💳 Give via Card</button>
            <p className="demo-note">⚙️ Demo mode — no real charge until Safaricom/Flutterwave keys are added.</p>
            {error && <p className="error">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
