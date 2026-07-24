// My profile: photo, badge status, verification, my listings and saved videos.
import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, getToken, uploadFiles, updateStoredUser } from '../api/client';
import VerifiedBadge from '../components/VerifiedBadge';
import Avatar from '../components/Avatar';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');
  const [savedReels, setSavedReels] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [tips, setTips] = useState({ total: 0, count: 0, tips: [] });
  const navigate = useNavigate();
  const fileRef = useRef(null);

  async function changePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const [url] = await uploadFiles([file]);
      const updated = await api('/api/users/me', { method: 'PUT', body: { avatarUrl: url } });
      setUser(updated);
      updateStoredUser(updated); // navbar picks it up on next page load
      setMessage('Profile photo updated ✔ (refresh to see it in the top bar)');
    } catch (err) { setMessage(err.message); }
  }

  useEffect(() => {
    if (!getToken()) { navigate('/login'); return; }
    api('/api/auth/me').then((u) => {
      setUser(u);
      api(`/api/users/${u.id}/followers`).then(setFollowers).catch(() => {});
      api(`/api/users/${u.id}/following`).then(setFollowingList).catch(() => {});
    }).catch(() => navigate('/login'));
    api('/api/reels/saved/mine').then(setSavedReels).catch(() => {});
    api('/api/listings/mine/all').then(setMyListings).catch(() => {});
    api('/api/payments/tips/received').then(setTips).catch(() => {});
  }, []);

  async function requestVerification() {
    const res = await api('/api/users/request-verification', { method: 'POST' });
    setMessage(res.message);
    setUser({ ...user, verification: res.verification });
  }

  if (!user) return <div className="page"><p>Loading…</p></div>;

  return (
    <div className="page narrow">
      <div className="profile-head">
        <Avatar src={user.avatarUrl} name={user.name} size={84} />
        <div>
          <h1>{user.name} <VerifiedBadge verification={user.verification} /></h1>
          <p className="meta">{user.email} · {user.role} {user.county && `· ${user.county} County`}</p>
          <p className="follow-stats">
            <b>{user.followersCount ?? 0}</b> Followers · <b>{user.followingCount ?? 0}</b> Following
          </p>
          <button className="btn small secondary" onClick={() => fileRef.current?.click()}>
            📷 {user.avatarUrl ? 'Change photo' : 'Add profile photo'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={changePhoto} />
        </div>
      </div>

      <div className="card">
        <h3>Verification Badge</h3>
        {user.verification !== 'ID_VERIFIED' && user.verification !== 'DEALER_VERIFIED' && (
          <>
            <p>Verified sellers get more buyer trust and appear higher in search. Get an <b>ID Verified</b> badge for KES 300/year, or a <b>Verified Dealer</b> badge for KES 1,000/year.</p>
            {user.verification === 'PENDING' && <p className="meta">⏳ You have a pending request — you can pay below to activate your badge instantly.</p>}
            <Link className="btn" to="/get-verified">Get Verified →</Link>
          </>
        )}
        {(user.verification === 'ID_VERIFIED' || user.verification === 'DEALER_VERIFIED') && (
          <>
            <p>✔ You are verified. Your badge shows on all your listings, reels and profile.</p>
            {user.verificationExpiry && (
              <p className="meta">
                Valid until {new Date(user.verificationExpiry).toLocaleDateString('en-KE', { dateStyle: 'long' })}.{' '}
                <Link to="/get-verified">Renew</Link>
              </p>
            )}
          </>
        )}
        {message && <p className="meta">{message}</p>}
      </div>

      {tips.count > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>🎁 Gifts Received</h3>
          <p className="price big">KES {tips.total.toLocaleString()}</p>
          <p className="meta">{tips.count} gift{tips.count === 1 ? '' : 's'} from the community. Thank you!</p>
          {tips.tips.slice(0, 5).map((t) => (
            <p key={t.id} className="meta">
              KES {t.amountKes.toLocaleString()} from {t.user?.name}{t.message ? ` — "${t.message}"` : ''}
            </p>
          ))}
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <h3>👥 Followers ({followers.length})</h3>
        {followers.length === 0 ? (
          <p className="meta">No followers yet — post reels and listings to grow your audience.</p>
        ) : (
          followers.map((f) => (
            <p key={f.id} className="follow-row">
              <Link to={`/users/${f.id}`} className="author-link dark">
                <Avatar src={f.avatarUrl} name={f.name} size={26} /> {f.name}
              </Link>
              <VerifiedBadge verification={f.verification} />
            </p>
          ))
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>➡️ Following ({followingList.length})</h3>
        {followingList.length === 0 ? (
          <p className="meta">Accounts you follow appear here. Tap + Follow on any reel.</p>
        ) : (
          followingList.map((f) => (
            <p key={f.id} className="follow-row">
              <Link to={`/users/${f.id}`} className="author-link dark">
                <Avatar src={f.avatarUrl} name={f.name} size={26} /> {f.name}
              </Link>
              <VerifiedBadge verification={f.verification} />
            </p>
          ))
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>🚗 My Listings ({myListings.length})</h3>
        {myListings.length === 0 ? (
          <p className="meta">Cars you post will appear here. <Link to="/post">Post one now</Link>.</p>
        ) : (
          myListings.map((l) => (
            <div key={l.id} className="my-listing-row">
              <Link to={`/listings/${l.id}`}>{l.title}</Link>
              <span className={`badge ${l.status === 'SOLD' ? 'badge-sold' : 'badge-id'}`}>{l.status}</span>
              <Link className="btn small secondary" to={`/listings/${l.id}/edit`}>✏️ Edit</Link>
            </div>
          ))
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>🔖 Saved Videos ({savedReels.length})</h3>
        {savedReels.length === 0 ? (
          <p className="meta">Videos you save on the Reels page will appear here.</p>
        ) : (
          savedReels.map((r) => (
            <p key={r.id}>
              <a href={`/reels#reel-${r.id}`}>🎬 {r.caption || 'Reel'} — @{r.author?.name}</a>
            </p>
          ))
        )}
      </div>
    </div>
  );
}
