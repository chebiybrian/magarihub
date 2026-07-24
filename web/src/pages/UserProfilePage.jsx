// Public profile page — opened by clicking someone's photo/name on reels,
// comments or seller cards. Shows their badge, follower counts, listings and reels.
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, getUser } from '../api/client';
import Avatar from '../components/Avatar';
import VerifiedBadge from '../components/VerifiedBadge';
import ListingCard from '../components/ListingCard';
import ContributeModal from '../components/ContributeModal';

export default function UserProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [giftOpen, setGiftOpen] = useState(false);
  const me = getUser();

  useEffect(() => {
    // your own public link goes to your editable profile instead
    if (me && me.id === Number(id)) { navigate('/profile'); return; }
    api(`/api/users/${id}`).then(setProfile).catch((e) => setError(e.message));
  }, [id]);

  async function toggleFollow() {
    if (!me) { navigate('/login'); return; }
    try {
      const r = await api(`/api/users/${id}/follow`, { method: 'POST' });
      setProfile({ ...profile, followedByMe: r.following, followersCount: r.followersCount });
    } catch (e) { setError(e.message); }
  }

  if (error) return <div className="page"><p className="error">{error}</p></div>;
  if (!profile) return <div className="page"><p>Loading…</p></div>;

  const memberSince = new Date(profile.createdAt).toLocaleDateString('en-KE', { year: 'numeric', month: 'long' });
  // inject seller info so listing cards show the right name/badge
  const listings = (profile.listings || []).map((l) => ({
    ...l,
    seller: { id: profile.id, name: profile.name, verification: profile.verification },
  }));

  return (
    <div className="page">
      {giftOpen && <ContributeModal recipient={{ id: profile.id, name: profile.name }} onClose={() => setGiftOpen(false)} />}
      <div className="profile-head">
        <Avatar src={profile.avatarUrl} name={profile.name} size={92} />
        <div>
          <h1>{profile.name} <VerifiedBadge verification={profile.verification} /></h1>
          <p className="meta">
            {profile.role}{profile.county ? ` · ${profile.county} County` : ''} · Member since {memberSince}
          </p>
          <p className="follow-stats">
            <b>{profile.followersCount}</b> Followers · <b>{profile.followingCount}</b> Following
          </p>
          {me && (
            <div className="profile-actions">
              <button className={`follow-btn light ${profile.followedByMe ? 'on' : ''}`}
                style={{ marginLeft: 0 }} onClick={toggleFollow}>
                {profile.followedByMe ? '✓ Following' : '+ Follow'}
              </button>
              <button className="btn small secondary" onClick={() => setGiftOpen(true)}>🎁 Gift</button>
            </div>
          )}
        </div>
      </div>
      {profile.bio && <p>{profile.bio}</p>}

      <h2 style={{ marginTop: 20 }}>🚗 Cars for Sale ({listings.length})</h2>
      {listings.length === 0 ? (
        <p className="meta">No cars listed right now.</p>
      ) : (
        <div className="grid">
          {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
        </div>
      )}

      <h2 style={{ marginTop: 24 }}>🎬 Reels ({profile.reels?.length || 0})</h2>
      {(profile.reels || []).length === 0 ? (
        <p className="meta">No reels posted yet.</p>
      ) : (
        <div className="card">
          {profile.reels.map((r) => (
            <p key={r.id} className="follow-row">
              <a href={`/reels#reel-${r.id}`}>🎬 {r.caption || 'Reel'}</a>
              <span className="meta">👁️ {r.views} · ❤️ {r.likes}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
