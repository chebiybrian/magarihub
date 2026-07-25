// Feature 3: drivers for hire. Only AI-vetted drivers (licence verified) are listed.
// Anyone can apply to become a driver by uploading their driving licence.
import { useEffect, useRef, useState } from 'react';
import { api, kes, getToken, uploadFiles, updateStoredUser } from '../api/client';
import VerifiedBadge from '../components/VerifiedBadge';
import Avatar from '../components/Avatar';

const COUNTIES = ['Nairobi', 'Mombasa', 'Kiambu', 'Nakuru', 'Kisumu', 'Uasin Gishu'];
const CLASSES = ['B', 'C1', 'C', 'D1', 'D'];

// The "become a driver" application, with licence upload + AI vetting.
function DriverApplication({ onClose, onVerified }) {
  const [f, setF] = useState({ typedName: '', dailyRateKes: '', county: 'Nairobi', yearsExperience: '', about: '', hasPsvBadge: false });
  const [file, setFile] = useState(null);
  const [live, setLive] = useState(false); // is real reading on? (ai or ocr)
  const [mode, setMode] = useState('demo'); // 'ai' | 'ocr' | 'demo'
  const [stage, setStage] = useState('form'); // form | vetting | verified | rejected
  const [result, setResult] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  const timerRef = useRef(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  useEffect(() => {
    api('/api/drivers/vetting-status').then((s) => { setLive(s.live); setMode(s.mode || (s.live ? 'ai' : 'demo')); }).catch(() => {});
    return () => clearInterval(timerRef.current);
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!file) return setError('Upload a photo or PDF of your driving licence.');
    if (!f.dailyRateKes || !f.county) return setError('Daily rate and county are required.');

    setStage('vetting');
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    try {
      const [licenseFileUrl] = await uploadFiles([file]);
      const res = await api('/api/drivers/apply', { method: 'POST', body: { ...f, licenseFileUrl } });
      clearInterval(timerRef.current);
      setResult(res);
      if (res.vetStatus === 'VERIFIED') {
        setStage('verified');
        // refresh cached user role
        try { const me = await api('/api/auth/me'); updateStoredUser(me); } catch { /* ignore */ }
        onVerified?.();
      } else {
        setStage('rejected');
      }
    } catch (err) {
      clearInterval(timerRef.current);
      setError(err.message);
      setStage('form');
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        {stage === 'form' && (
          <>
            <h2>Become a Driver 🧑‍✈️</h2>
            <p className="meta">
              To keep riders safe, every driver is verified. Upload your <b>driving licence</b> (photo or PDF) —
              it's read automatically in seconds, and the name on your licence becomes your official driver name.
            </p>
            <form className="stack" onSubmit={submit}>
              <label className="file-label">
                🪪 {file ? `Selected: ${file.name}` : 'Upload driving licence (photo or PDF)'}
                <input ref={fileRef} type="file" accept="image/*,application/pdf" hidden
                  onChange={(e) => setFile(e.target.files[0] || null)} />
              </label>
              {!live && (
                <input placeholder="Your full name (used in demo mode)" value={f.typedName} onChange={set('typedName')} />
              )}
              <div className="filters">
                <input type="number" placeholder="Daily rate (KES)" value={f.dailyRateKes} onChange={set('dailyRateKes')} required />
                <input type="number" placeholder="Years experience" value={f.yearsExperience} onChange={set('yearsExperience')} />
                <select value={f.county} onChange={set('county')}>{COUNTIES.map((c) => <option key={c}>{c}</option>)}</select>
              </div>
              <label className="meta"><input type="checkbox" checked={f.hasPsvBadge} onChange={set('hasPsvBadge')} /> I have a PSV badge</label>
              <textarea rows="2" placeholder="About you — experience, routes, languages…" value={f.about} onChange={set('about')} />
              {error && <p className="error">{error}</p>}
              <button className="btn" type="submit">Submit for Verification</button>
              {mode === 'demo' && <p className="demo-note">⚙️ Demo mode — vetting is simulated. Enable OCR or add an AI key for real licence reading.</p>}
              {mode === 'ocr' && <p className="demo-note">📷 Tip: upload a clear, flat, well-lit photo of the front of your licence for the best automatic read.</p>}
            </form>
          </>
        )}

        {stage === 'vetting' && (
          <div className="pay-waiting">
            <div className="spinner" />
            <h3>Verifying your licence…</h3>
            <p className="meta">AI is reading your document. This takes under 31 seconds.</p>
            <p className="price big">{seconds}s</p>
          </div>
        )}

        {stage === 'verified' && (
          <div className="verify-done">
            <div className="verify-check">✓</div>
            <h2>Verified in {((result?.tookMs || 0) / 1000).toFixed(1)}s 🎉</h2>
            <p>Your driver name is <b>{result.licenseName}</b>{result.licenseClasses ? `, licence class ${result.licenseClasses}` : ''}.
               You're now listed in Drivers for Hire.</p>
            <button className="btn" onClick={onClose}>Done</button>
          </div>
        )}

        {stage === 'rejected' && (
          <div className="verify-done">
            <div className="verify-check" style={{ background: '#b91c1c' }}>✕</div>
            <h2>Couldn't verify</h2>
            <p className="meta">{result?.notes || 'The licence could not be verified.'}</p>
            <button className="btn" onClick={() => setStage('form')}>Try again</button>
          </div>
        )}
      </div>
    </div>
  );
}

// Edit my own driver details (rate, county, availability). No re-vetting needed.
function EditDriverModal({ profile, onClose, onSaved }) {
  const [f, setF] = useState({
    dailyRateKes: profile.dailyRateKes || '',
    county: profile.county || 'Nairobi',
    yearsExperience: profile.yearsExperience || '',
    licenseClasses: profile.licenseClasses || '',
    about: profile.about || '',
    hasPsvBadge: !!profile.hasPsvBadge,
    available: profile.available !== false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await api('/api/drivers/me', { method: 'PUT', body: f });
      setSaved(true);
      onSaved?.();
      setTimeout(onClose, 900);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2>My Driver Profile</h2>
        <p className="meta">
          Listed as <b>{profile.displayName}</b> 🪪 licence verified. Update your rate and details anytime.
        </p>
        <form className="stack" onSubmit={submit}>
          <label className="pay-label">Daily rate (KES)</label>
          <input className="pay-input" type="number" value={f.dailyRateKes} onChange={set('dailyRateKes')} required />
          <div className="filters">
            <select value={f.county} onChange={set('county')}>{COUNTIES.map((c) => <option key={c}>{c}</option>)}</select>
            <input type="number" placeholder="Years experience" value={f.yearsExperience} onChange={set('yearsExperience')} />
            <input placeholder="Licence classes e.g. B,C1" value={f.licenseClasses} onChange={set('licenseClasses')} />
          </div>
          <textarea rows="2" placeholder="About you" value={f.about} onChange={set('about')} />
          <label className="meta"><input type="checkbox" checked={f.hasPsvBadge} onChange={set('hasPsvBadge')} /> I have a PSV badge</label>
          <label className="meta"><input type="checkbox" checked={f.available} onChange={set('available')} /> Available for hire (uncheck to hide from the list)</label>
          {error && <p className="error">{error}</p>}
          {saved && <p className="meta">✔ Saved</p>}
          <button className="btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
        </form>
      </div>
    </div>
  );
}

// Star display / input. Pass onPick to make it clickable.
function Stars({ value = 0, size = 16, onPick }) {
  return (
    <span className={`stars ${onPick ? 'clickable' : ''}`} style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= Math.round(value) ? 'star on' : 'star'}
          onClick={onPick ? () => onPick(n) : undefined}>★</span>
      ))}
    </span>
  );
}

function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// Reviews panel for one driver: read reviews, leave/update your own rating.
function ReviewsModal({ driver, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const loggedIn = !!getToken();

  async function load() {
    try {
      const d = await api(`/api/drivers/${driver.id}/reviews`);
      setData(d);
      if (d.mine) { setRating(d.mine.rating); setComment(d.mine.comment || ''); }
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, [driver.id]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!rating) return setError('Pick a star rating first.');
    setBusy(true);
    try {
      await api(`/api/drivers/${driver.id}/reviews`, { method: 'POST', body: { rating, comment } });
      await load();
      onChanged?.();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function removeMine() {
    if (!window.confirm('Delete your review?')) return;
    await api(`/api/drivers/${driver.id}/reviews/mine`, { method: 'DELETE' });
    setRating(0); setComment('');
    await load();
    onChanged?.();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2>{driver.displayName}</h2>
        <p className="meta">
          {data ? (
            data.count ? <><Stars value={data.average} /> <b>{data.average}</b> · {data.count} review{data.count === 1 ? '' : 's'}</>
              : 'No reviews yet — be the first.'
          ) : 'Loading…'}
        </p>

        {loggedIn ? (
          <form className="stack review-form" onSubmit={submit}>
            <label className="pay-label">{data?.mine ? 'Update your review' : 'Rate your experience'}</label>
            <Stars value={rating} size={30} onPick={setRating} />
            <textarea rows="3" placeholder="How was the trip? Punctual, careful, knows the routes…"
              value={comment} onChange={(e) => setComment(e.target.value)} maxLength={600} />
            {error && <p className="error">{error}</p>}
            <div className="filters">
              <button className="btn" type="submit" disabled={busy}>
                {busy ? 'Saving…' : data?.mine ? 'Update review' : 'Post review'}
              </button>
              {data?.mine && <button className="btn small danger" type="button" onClick={removeMine}>Delete mine</button>}
            </div>
          </form>
        ) : (
          <p className="meta">Log in to leave a rating.</p>
        )}

        <div className="review-list">
          {data?.reviews.map((r) => (
            <div className="review" key={r.id}>
              <div className="review-head">
                <Avatar src={r.author?.avatarUrl} name={r.author?.name} size={26} />
                <b>{r.author?.name}</b>
                <VerifiedBadge verification={r.author?.verification} />
                <span className="meta">{timeAgo(r.createdAt)}</span>
              </div>
              <Stars value={r.rating} />
              {r.comment && <p>{r.comment}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [county, setCounty] = useState('');
  const [licenseClass, setLicenseClass] = useState('');
  const [applyOpen, setApplyOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [myProfile, setMyProfile] = useState(null); // my own driver profile, if any
  const [reviewing, setReviewing] = useState(null); // driver whose reviews are open
  const [error, setError] = useState('');

  async function load() {
    try {
      const params = new URLSearchParams();
      if (county) params.set('county', county);
      if (licenseClass) params.set('licenseClass', licenseClass);
      setDrivers(await api(`/api/drivers?${params}`));
    } catch (e) { setError(e.message); }
  }

  async function loadMine() {
    if (!getToken()) return;
    try { setMyProfile(await api('/api/drivers/me')); } catch { /* not a driver */ }
  }

  useEffect(() => { load(); }, [county, licenseClass]);
  useEffect(() => { loadMine(); }, []);

  return (
    <div className="page">
      {applyOpen && <DriverApplication onClose={() => setApplyOpen(false)} onVerified={() => { load(); loadMine(); }} />}
      {editOpen && myProfile && (
        <EditDriverModal profile={myProfile} onClose={() => setEditOpen(false)}
          onSaved={() => { load(); loadMine(); }} />
      )}
      {reviewing && <ReviewsModal driver={reviewing} onClose={() => setReviewing(null)} onChanged={load} />}
      <div className="drivers-head">
        <div>
          <h1>Drivers for Hire</h1>
          <p className="meta">Personal, PSV-badged and long-distance drivers — every one licence-verified.</p>
        </div>
        {myProfile?.vetStatus === 'VERIFIED' ? (
          <button className="btn" onClick={() => setEditOpen(true)}>⚙️ My Driver Profile</button>
        ) : (
          <button className="btn" onClick={() => (getToken() ? setApplyOpen(true) : (window.location.href = '/login'))}>
            🧑‍✈️ Become a Driver
          </button>
        )}
      </div>

      <div className="filters">
        <select value={county} onChange={(e) => setCounty(e.target.value)}>
          <option value="">All Counties</option>
          {COUNTIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={licenseClass} onChange={(e) => setLicenseClass(e.target.value)}>
          <option value="">Any License Class</option>
          {CLASSES.map((c) => <option key={c} value={c}>Class {c}</option>)}
        </select>
      </div>

      {error && <p className="error">{error}</p>}
      <div className="grid">
        {drivers.map((d) => (
          <div className="card driver-card" key={d.id}>
            <h3>
              <Avatar src={d.user.avatarUrl} name={d.displayName} size={40} />{' '}
              {d.displayName} <span className="badge badge-id" title="Driving licence verified by AI">🪪 Licence Verified</span>
            </h3>
            <p className="price">{kes(d.dailyRateKes)} / day</p>
            <p className="meta rating-row">
              {d.reviewCount > 0
                ? <><Stars value={d.rating} /> <b>{d.rating}</b> ({d.reviewCount})</>
                : <span>No ratings yet</span>}
              {' · '}{d.yearsExperience} yrs · {d.county}
            </p>
            <p className="meta">
              License: {d.licenseClasses || '—'} {d.hasPsvBadge && '· PSV badge ✔'}
            </p>
            {d.about && <p>{d.about}</p>}
            <div className="filters">
              {d.user.phone && <a className="btn" href={`tel:${d.user.phone}`}>Call Driver</a>}
              <button className="btn secondary" onClick={() => setReviewing(d)}>
                ⭐ Reviews{d.reviewCount ? ` (${d.reviewCount})` : ''}
              </button>
            </div>
          </div>
        ))}
        {drivers.length === 0 && !error && <p>No verified drivers yet for those filters.</p>}
      </div>
    </div>
  );
}
