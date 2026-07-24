// Feature 6: car parts with manufacturer reference numbers.
import { useEffect, useState } from 'react';
import { api, kes, getUser } from '../api/client';
import VerifiedBadge from '../components/VerifiedBadge';
import AdsBanner from '../components/AdsBanner';

export default function PartsPage() {
  const me = getUser();
  const [parts, setParts] = useState([]);
  const [q, setQ] = useState('');
  const [ref, setRef] = useState('');
  const [error, setError] = useState('');

  async function load() {
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (ref) params.set('ref', ref);
      setParts(await api(`/api/parts?${params}`));
    } catch (e) { setError(e.message); }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="page">
      <AdsBanner />
      <h1>Car Parts & Spares</h1>
      <p className="meta">Search by part name or manufacturer reference number to get the exact fit for your car.</p>

      <form className="filters" onSubmit={(e) => { e.preventDefault(); load(); }}>
        <input placeholder="Part name e.g. oil filter" value={q} onChange={(e) => setQ(e.target.value)} />
        <input placeholder="Reference no. e.g. 90915-YZZE1" value={ref} onChange={(e) => setRef(e.target.value)} />
        <button className="btn" type="submit">Search Parts</button>
      </form>

      {error && <p className="error">{error}</p>}
      <div className="grid">
        {parts.map((p) => (
          <div className="card" key={p.id}>
            <h3>{p.name}</h3>
            <p className="ref-no">Ref: <code>{p.referenceNo}</code></p>
            <p className="price">{kes(p.priceKes)}</p>
            <p className="meta">Fits: {p.compatible}</p>
            <p className="meta">
              {p.condition.replace('_', ' ')} · {p.county} · {p.seller?.name}{' '}
              <VerifiedBadge verification={p.seller?.verification} />
            </p>
            {p.seller?.phone && <a className="btn" href={`tel:${p.seller.phone}`}>Call Seller</a>}
            {me && p.seller?.id === me.id && (
              <button
                className="btn small danger"
                style={{ marginLeft: 8 }}
                onClick={async () => {
                  if (!window.confirm('Delete this part permanently?')) return;
                  try {
                    await api(`/api/parts/${p.id}`, { method: 'DELETE' });
                    setParts(parts.filter((x) => x.id !== p.id));
                  } catch (e) { setError(e.message); }
                }}
              >
                🗑 Delete
              </button>
            )}
          </div>
        ))}
        {parts.length === 0 && !error && <p>No parts found. Try a different name or reference number.</p>}
      </div>
    </div>
  );
}
