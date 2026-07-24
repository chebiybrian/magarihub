// Listing card with a mini photo carousel:
// hover shows ‹ › arrows to flip through the seller's photos, dots show position.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { kes, mediaUrl } from '../api/client';
import VerifiedBadge from './VerifiedBadge';

const FALLBACK = 'https://picsum.photos/seed/magari/800/500';

export default function ListingCard({ listing }) {
  const images = (listing.images?.length ? listing.images : [FALLBACK]).map(mediaUrl);
  const n = images.length;
  const [i, setI] = useState(0);

  // Arrows sit inside a <Link> — stop the click from opening the listing
  function step(e, dir) {
    e.preventDefault();
    e.stopPropagation();
    setI((i + dir + n) % n);
  }

  return (
    <Link to={`/listings/${listing.id}`} className="card listing-card">
      <div className="card-photo">
        <img src={images[i]} alt={listing.title} loading="lazy" />
        {n > 1 && (
          <>
            <button className="mini-arrow left" onClick={(e) => step(e, -1)} aria-label="Previous photo">‹</button>
            <button className="mini-arrow right" onClick={(e) => step(e, 1)} aria-label="Next photo">›</button>
            <div className="mini-dots">
              {images.map((_, d) => <span key={d} className={d === i ? 'on' : ''} />)}
            </div>
          </>
        )}
      </div>
      <div className="card-body">
        <h3>{listing.title}</h3>
        <p className="price">{kes(listing.priceKes)}</p>
        <p className="meta">
          {listing.year} · {Number(listing.mileageKm).toLocaleString()} km · {listing.county}
        </p>
        <p className="meta">
          {listing.condition === 'FOREIGN_USED' ? 'Foreign Used' : listing.condition === 'LOCALLY_USED' ? 'Locally Used' : 'New'}
          {' · '}{listing.seller?.name} <VerifiedBadge verification={listing.seller?.verification} />
        </p>
      </div>
    </Link>
  );
}
