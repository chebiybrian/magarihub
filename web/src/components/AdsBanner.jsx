// Rotating "Sponsored" banner — shown on Listings, Insurance and Parts pages.
// Ads come from GET /api/ads; rotates every 5 seconds.
import { useEffect, useState } from 'react';
import { api, mediaUrl } from '../api/client';
import KenyaFlag from './KenyaFlag';

export default function AdsBanner() {
  const [ads, setAds] = useState([]);
  const [i, setI] = useState(0);

  useEffect(() => {
    api('/api/ads').then(setAds).catch(() => {}); // no ads = no banner, never an error
  }, []);

  useEffect(() => {
    if (ads.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % ads.length), 5000);
    return () => clearInterval(t);
  }, [ads.length]);

  if (ads.length === 0) return null;
  const ad = ads[i];
  // Special slide: animated metallic Kenyan flag instead of a photo
  const isFlag = ad.imageUrl === 'KENYA_FLAG';

  return (
    <a
      className={`ad-banner ${isFlag ? 'ad-flag' : ''}`}
      href={ad.linkUrl || '#'}
      target={ad.linkUrl?.startsWith('http') ? '_blank' : '_self'}
      rel="noreferrer"
      style={isFlag ? undefined : { backgroundImage: `url(${mediaUrl(ad.imageUrl)})` }}
    >
      {isFlag && <KenyaFlag />}
      <span className="ad-tag">Sponsored</span>
      <div className="ad-text">
        <b>{ad.title}</b>
        {ad.text && <p>{ad.text}</p>}
        {ad.sponsor && <span className="ad-sponsor">{ad.sponsor}</span>}
      </div>
      {ads.length > 1 && (
        <div className="mini-dots ad-dots">
          {ads.map((_, d) => <span key={d} className={d === i ? 'on' : ''} />)}
        </div>
      )}
    </a>
  );
}
