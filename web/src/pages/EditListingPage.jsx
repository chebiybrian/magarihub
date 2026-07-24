// Edit my listing: change details, remove/add photos, mark as SOLD.
// Only the listing owner can open this page.
import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api, getUser, mediaUrl, uploadFiles } from '../api/client';
import PhotoPicker from '../components/PhotoPicker';

const MAKES = ['Toyota', 'Mazda', 'Nissan', 'Subaru', 'Honda', 'Mitsubishi', 'Mercedes-Benz', 'BMW', 'Volkswagen', 'Suzuki', 'Isuzu', 'Other'];
const COUNTIES = ['Nairobi', 'Mombasa', 'Kiambu', 'Nakuru', 'Kisumu', 'Uasin Gishu', 'Machakos', 'Kajiado', 'Other'];

export default function EditListingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [f, setF] = useState(null);
  const [kept, setKept] = useState([]); // existing photos still attached
  const [files, setFiles] = useState([]); // new photos to upload
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [myReels, setMyReels] = useState([]);
  const [reelsError, setReelsError] = useState('');

  useEffect(() => {
    api(`/api/listings/${id}`)
      .then((l) => {
        const me = getUser();
        if (!me || me.id !== l.seller.id) { navigate(`/listings/${id}`); return; }
        setF({
          title: l.title, make: l.make, model: l.model, year: l.year,
          priceKes: l.priceKes, mileageKm: l.mileageKm, condition: l.condition,
          transmission: l.transmission, fuelType: l.fuelType, engineCc: l.engineCc || '',
          county: l.county, description: l.description || '', status: l.status,
        });
        setKept(l.images);
      })
      .catch((e) => setError(e.message));
    // my reels, so I can link/unlink them to this car
    api('/api/reels/mine')
      .then((rs) => setMyReels(Array.isArray(rs) ? rs : []))
      .catch((e) => setReelsError(e.message));
  }, [id]);

  // Link or unlink one of my reels to this listing
  async function toggleReel(reel) {
    const linked = String(reel.listingId) === String(id);
    try {
      await api(`/api/reels/${reel.id}`, {
        method: 'PUT',
        body: { listingId: linked ? null : Number(id) },
      });
      setMyReels((rs) => rs.map((r) => r.id === reel.id
        ? { ...r, listingId: linked ? null : Number(id) } : r));
    } catch (e) { setReelsError(e.message); }
  }

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const uploaded = await uploadFiles(files);
      await api(`/api/listings/${id}`, { method: 'PUT', body: { ...f, images: [...kept, ...uploaded] } });
      navigate(`/listings/${id}`);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  if (error && !f) return <div className="page"><p className="error">{error}</p></div>;
  if (!f) return <div className="page"><p>Loading…</p></div>;

  return (
    <div className="page narrow-wide">
      <Link to={`/listings/${id}`}>← Back to listing</Link>
      <h1>Edit Listing</h1>
      <form className="stack" onSubmit={save}>
        <input value={f.title} onChange={set('title')} required />
        <div className="filters">
          <select value={f.make} onChange={set('make')}>{MAKES.map((m) => <option key={m}>{m}</option>)}</select>
          <input value={f.model} onChange={set('model')} required />
          <input type="number" value={f.year} onChange={set('year')} required />
        </div>
        <div className="filters">
          <input type="number" placeholder="Price KES" value={f.priceKes} onChange={set('priceKes')} required />
          <input type="number" placeholder="Mileage km" value={f.mileageKm} onChange={set('mileageKm')} />
          <input type="number" placeholder="Engine cc" value={f.engineCc} onChange={set('engineCc')} />
        </div>
        <div className="filters">
          <select value={f.condition} onChange={set('condition')}>
            <option value="FOREIGN_USED">Foreign Used</option>
            <option value="LOCALLY_USED">Locally Used</option>
            <option value="NEW">Brand New</option>
          </select>
          <select value={f.transmission} onChange={set('transmission')}>
            <option>Automatic</option><option>Manual</option>
          </select>
          <select value={f.fuelType} onChange={set('fuelType')}>
            <option>Petrol</option><option>Diesel</option><option>Hybrid</option><option>Electric</option>
          </select>
          <select value={f.county} onChange={set('county')}>{COUNTIES.map((c) => <option key={c}>{c}</option>)}</select>
        </div>
        <textarea rows="3" value={f.description} onChange={set('description')} />

        <label>Current photos — click ✕ to remove</label>
        <div className="preview-row">
          {kept.map((src, i) => (
            <div key={i} className="kept-photo">
              <img src={mediaUrl(src)} alt={`Photo ${i + 1}`} />
              <button type="button" onClick={() => setKept(kept.filter((_, x) => x !== i))} title="Remove photo">✕</button>
            </div>
          ))}
          {kept.length === 0 && <p className="meta">No photos attached.</p>}
        </div>

        <PhotoPicker files={files} setFiles={setFiles} label="📷 Add more photos" />

        {/* Link your reels to this car */}
        <div className="attach-car">
          <b>🎬 Reels linked to this car</b>
          <p className="meta">
            Linked reels show a "View car" button that brings viewers straight to this listing.
          </p>
          {reelsError && <p className="error">{reelsError}</p>}
          {myReels.length === 0 && !reelsError && (
            <p className="meta">You haven't posted any reels yet — post one from <b>+ Post → Post a Reel</b>.</p>
          )}
          {myReels.map((r) => {
            const linkedHere = String(r.listingId) === String(id);
            const linkedElsewhere = r.listingId && !linkedHere;
            return (
              <div className="reel-link-row" key={r.id}>
                <video src={mediaUrl(r.videoUrl)} muted preload="metadata" />
                <div className="reel-link-info">
                  <b>{r.caption || 'Untitled reel'}</b>
                  <span className="meta">👁️ {r.views} · ❤️ {r.likes}{linkedElsewhere ? ' · linked to another car' : ''}</span>
                </div>
                <button type="button"
                  className={`btn small ${linkedHere ? '' : 'secondary'}`}
                  onClick={() => toggleReel(r)}>
                  {linkedHere ? '✓ Linked' : '+ Link'}
                </button>
              </div>
            );
          })}
        </div>

        <select value={f.status} onChange={set('status')}>
          <option value="AVAILABLE">✅ Available for sale</option>
          <option value="SOLD">🏁 SOLD — hide from buyers</option>
        </select>

        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save Changes'}</button>
      </form>
    </div>
  );
}
