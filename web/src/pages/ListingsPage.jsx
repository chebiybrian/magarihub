// Unified Listings + meta-search page:
// filters + price slider + MagariHub results + deep links into other platforms.
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import ListingCard from '../components/ListingCard';
import AdsBanner from '../components/AdsBanner';

const MAKES = ['', 'Toyota', 'Mazda', 'Nissan', 'Subaru', 'Honda', 'Mitsubishi', 'Mercedes-Benz', 'BMW', 'Volkswagen', 'Suzuki', 'Isuzu'];
const COUNTIES = ['Nairobi', 'Mombasa', 'Kiambu', 'Nakuru', 'Kisumu', 'Uasin Gishu', 'Machakos', 'Kajiado'];
const PRICE_MIN = 0;
const PRICE_MAX = 10000000; // KES 10M
const PRICE_STEP = 50000;
const fmtPrice = (v) => Number(v) >= PRICE_MAX ? 'KES 10M+' : `KES ${(Number(v) / 1000000).toFixed(2)}M`;

export default function ListingsPage() {
  const [f, setF] = useState({ make: '', q: '', county: '', condition: '' });
  const [minPrice, setMinPrice] = useState(PRICE_MIN);
  const [maxPrice, setMaxPrice] = useState(PRICE_MAX);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  function onMin(e) { setMinPrice(Math.min(Number(e.target.value), maxPrice - PRICE_STEP)); }
  function onMax(e) { setMaxPrice(Math.max(Number(e.target.value), minPrice + PRICE_STEP)); }
  const pct = (v) => ((v - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;

  // Typed-in prices. Anything at/above 10M means "no upper limit".
  function commitMin(raw) {
    const v = Math.max(PRICE_MIN, Math.min(Number(raw) || 0, PRICE_MAX - PRICE_STEP));
    setMinPrice(Math.min(v, maxPrice - PRICE_STEP));
    search();
  }
  function commitMax(raw) {
    const n = Number(raw);
    const v = !n ? PRICE_MAX : Math.min(Math.max(n, PRICE_MIN + PRICE_STEP), PRICE_MAX);
    setMaxPrice(Math.max(v, minPrice + PRICE_STEP));
    search();
  }

  async function search(e) {
    e?.preventDefault();
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      // aggregate endpoint understands make/model/q/county/minPrice/maxPrice
      if (f.make) params.set('make', f.make);
      if (f.q) params.set('q', f.q);
      if (f.county) params.set('county', f.county);
      if (minPrice > PRICE_MIN) params.set('minPrice', minPrice);
      if (maxPrice < PRICE_MAX) params.set('maxPrice', maxPrice);
      const res = await api(`/api/aggregate/search?${params}`);
      // apply the "condition" filter locally (aggregate keeps it simple)
      if (f.condition) res.magarihub = res.magarihub.filter((l) => l.condition === f.condition);
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { search(); }, []); // load everything on open

  return (
    <div className="page">
      <AdsBanner />
      <h1>Find a Car in Kenya 🔎</h1>
      <p className="meta">
        Search MagariHub and Kenya's biggest platforms at once — Jiji, Kai &amp; Karo,
        Facebook Marketplace, BeForward, SBT Japan, AutoChek and more.
      </p>

      <form className="filters" onSubmit={search}>
        <input placeholder="Search e.g. Vitz, Prado, hybrid" value={f.q} onChange={set('q')} />
        <select value={f.make} onChange={set('make')}>
          {MAKES.map((m) => <option key={m} value={m}>{m || 'All Makes'}</option>)}
        </select>
        <select value={f.county} onChange={set('county')}>
          <option value="">All Counties</option>
          {COUNTIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={f.condition} onChange={set('condition')}>
          <option value="">Any Condition</option>
          <option value="FOREIGN_USED">Foreign Used</option>
          <option value="LOCALLY_USED">Locally Used</option>
          <option value="NEW">Brand New</option>
        </select>
        <button className="btn" type="submit">Search</button>
      </form>

      {/* Dual-handle price range slider + manual entry */}
      <div className="price-range">
        <div className="price-range-labels">
          <span>Price range</span>
          <b>{fmtPrice(minPrice)} — {fmtPrice(maxPrice)}</b>
        </div>
        <div className="price-inputs">
          <span className="meta">KES</span>
          <input
            type="number" min={PRICE_MIN} max={PRICE_MAX} step={PRICE_STEP}
            placeholder="Min" value={minPrice || ''}
            onChange={(e) => setMinPrice(Number(e.target.value) || 0)}
            onBlur={(e) => commitMin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), commitMin(e.target.value))}
          />
          <span className="meta">to</span>
          <input
            type="number" min={PRICE_MIN} max={PRICE_MAX} step={PRICE_STEP}
            placeholder="Max (blank = any)" value={maxPrice >= PRICE_MAX ? '' : maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value) || PRICE_MAX)}
            onBlur={(e) => commitMax(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), commitMax(e.target.value))}
          />
        </div>
        <div className="range-track">
          <div className="range-fill" style={{ left: `${pct(minPrice)}%`, right: `${100 - pct(maxPrice)}%` }} />
          <input type="range" min={PRICE_MIN} max={PRICE_MAX} step={PRICE_STEP} value={minPrice} onChange={onMin} onMouseUp={search} onTouchEnd={search} />
          <input type="range" min={PRICE_MIN} max={PRICE_MAX} step={PRICE_STEP} value={maxPrice} onChange={onMax} onMouseUp={search} onTouchEnd={search} />
        </div>
      </div>

      {error && <p className="error">{error} — is the backend running on port 4000?</p>}

      {loading ? <p>Searching…</p> : result && (
        <>
          <h2 className="agg-heading">
            <span className="src-dot" style={{ background: '#1a7a3a' }} />
            On MagariHub ({result.magarihub.length})
          </h2>
          {result.magarihub.length === 0 ? (
            <p className="meta">No cars on MagariHub match those filters — try the platforms below.</p>
          ) : (
            <div className="grid">
              {result.magarihub.map((l) => (
                <ListingCard key={l.id} listing={{ ...l, images: l.imageUrl ? [l.imageUrl] : [] }} />
              ))}
            </div>
          )}

          <h2 className="agg-heading">Also search these platforms</h2>
          <p className="meta">Opens each site pre-filtered to your search, in a new tab.</p>
          <div className="src-grid">
            {result.external.map((s) => (
              <a key={s.source} className="src-card" href={s.url} target="_blank" rel="noreferrer"
                 style={{ borderTopColor: s.sourceColor }}>
                <div className="src-head">
                  <span className="src-dot" style={{ background: s.sourceColor }} />
                  <b>{s.sourceName}</b>
                </div>
                <p className="meta">{s.note}</p>
                <span className="src-tag">{s.country}</span>
                <span className="src-go" style={{ color: s.sourceColor }}>Search here →</span>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
