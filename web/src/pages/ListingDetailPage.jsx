// Single car page: photos, specs, seller contact with verification badge.
// Owners also get Edit / Mark Sold / Delete controls.
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api, kes, mediaUrl, getUser } from '../api/client';
import VerifiedBadge from '../components/VerifiedBadge';
import PhotoSlideshow from '../components/PhotoSlideshow';
import Avatar from '../components/Avatar';

// Shows how this listing's price compares to the market range.
function MarketCompare({ listing, market }) {
  const price = listing.priceKes;
  const { low, mid, high } = market;
  // position of this listing's price along the low→high bar (clamped)
  const span = Math.max(high - low, 1);
  const pos = Math.max(0, Math.min(100, ((price - low) / span) * 100));

  let verdict, cls;
  if (price < mid * 0.92) { verdict = 'Below market — looks like a good deal'; cls = 'good'; }
  else if (price > mid * 1.12) { verdict = 'Above market — worth negotiating'; cls = 'high'; }
  else { verdict = 'Around the market average — a fair price'; cls = 'fair'; }

  return (
    <div className={`market-compare ${cls}`}>
      <div className="market-compare-head">
        <b>{verdict}</b>
        <span className="meta">Market: {kes(low)} – {kes(high)}</span>
      </div>
      <div className="market-bar">
        <div className="market-bar-track" />
        <div className="market-you" style={{ left: `${pos}%` }} title="This car">▲</div>
      </div>
      <p className="meta">
        {market.basis === 'listings'
          ? `Based on ${market.sampleSize} similar cars on MagariHub.`
          : `Estimated typical price: ${kes(mid)}. `}
        Actual value varies with mileage, history and condition.{' '}
        <Link to="/price-check">Check another car →</Link>
      </p>
    </div>
  );
}

export default function ListingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [sellerInfo, setSellerInfo] = useState(null); // follower count + follow state
  const [market, setMarket] = useState(null); // market price estimate
  const [error, setError] = useState('');
  const me = getUser();
  const isOwner = me && listing && listing.seller?.id === me.id;

  useEffect(() => {
    api(`/api/listings/${id}`).then((l) => {
      setListing(l);
      api(`/api/users/${l.seller.id}`).then(setSellerInfo).catch(() => {});
      // market price for how this listing compares
      const p = new URLSearchParams({ make: l.make, model: l.model, year: l.year, condition: l.condition });
      api(`/api/market/price?${p}`).then(setMarket).catch(() => {});
    }).catch((e) => setError(e.message));
  }, [id]);

  async function toggleFollowSeller() {
    if (!me) { navigate('/login'); return; }
    try {
      const r = await api(`/api/users/${listing.seller.id}/follow`, { method: 'POST' });
      setSellerInfo({ ...sellerInfo, followedByMe: r.following, followersCount: r.followersCount });
    } catch (e) { setError(e.message); }
  }

  async function toggleSold() {
    const status = listing.status === 'SOLD' ? 'AVAILABLE' : 'SOLD';
    try {
      await api(`/api/listings/${id}`, { method: 'PUT', body: { status } });
      setListing({ ...listing, status });
    } catch (e) { setError(e.message); }
  }

  async function deleteListing() {
    if (!window.confirm('Delete this listing permanently? This cannot be undone.')) return;
    try {
      await api(`/api/listings/${id}`, { method: 'DELETE' });
      navigate('/');
    } catch (e) { setError(e.message); }
  }

  if (error) return <div className="page"><p className="error">{error}</p></div>;
  if (!listing) return <div className="page"><p>Loading…</p></div>;

  return (
    <div className="page">
      <Link to="/">← Back to listings</Link>
      <h1>
        {listing.title}{' '}
        {listing.status === 'SOLD' && <span className="badge badge-sold">SOLD</span>}
      </h1>
      <p className="price big">{kes(listing.priceKes)}</p>

      {market && market.mid && <MarketCompare listing={listing} market={market} />}

      {isOwner && (
        <div className="owner-bar">
          <span className="meta">This is your listing:</span>
          <Link className="btn small secondary" to={`/listings/${id}/edit`}>✏️ Edit</Link>
          <button className="btn small secondary" onClick={toggleSold}>
            {listing.status === 'SOLD' ? '↩️ Mark Available' : '🏁 Mark as Sold'}
          </button>
          <button className="btn small danger" onClick={deleteListing}>🗑 Delete</button>
        </div>
      )}

      <PhotoSlideshow images={listing.images.map(mediaUrl)} />

      <div className="spec-grid">
        <div><b>Make</b> {listing.make}</div>
        <div><b>Model</b> {listing.model}</div>
        <div><b>Year</b> {listing.year}</div>
        <div><b>Mileage</b> {Number(listing.mileageKm).toLocaleString()} km</div>
        <div><b>Engine</b> {listing.engineCc ? `${listing.engineCc} cc` : '—'}</div>
        <div><b>Transmission</b> {listing.transmission}</div>
        <div><b>Fuel</b> {listing.fuelType}</div>
        <div><b>Location</b> {listing.county} County</div>
      </div>

      {listing.description && <p>{listing.description}</p>}

      <div className="card seller-card">
        <h3>
          <Link to={`/users/${listing.seller.id}`} className="author-link dark" title="View seller profile">
            <Avatar src={listing.seller.avatarUrl} name={listing.seller.name} size={40} />
            {listing.seller.name}
          </Link>
          {' '}<VerifiedBadge verification={listing.seller.verification} />
          {!isOwner && me && sellerInfo && (
            <button className={`follow-btn light ${sellerInfo.followedByMe ? 'on' : ''}`} onClick={toggleFollowSeller}>
              {sellerInfo.followedByMe ? '✓ Following' : '+ Follow'}
            </button>
          )}
        </h3>
        {sellerInfo && (
          <p className="follow-stats">
            <b>{sellerInfo.followersCount}</b> Followers · <b>{sellerInfo.followingCount}</b> Following
          </p>
        )}
        <p>{listing.seller.county} County</p>
        {listing.seller.phone && (
          <a className="btn" href={`tel:${listing.seller.phone}`}>Call {listing.seller.phone}</a>
        )}{' '}
        {listing.seller.phone && (
          <a className="btn secondary" href={`https://wa.me/${listing.seller.phone.replace('+', '')}`} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
        )}
        <p className="meta">Tip: always view the car and verify the logbook on NTSA TIMS before paying anything.</p>
      </div>
    </div>
  );
}
