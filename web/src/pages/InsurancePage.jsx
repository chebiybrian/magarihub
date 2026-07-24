// Feature 4: compare insurance policies + instant premium estimate.
import { useEffect, useState } from 'react';
import { api, kes } from '../api/client';
import AdsBanner from '../components/AdsBanner';

export default function InsurancePage() {
  const [policies, setPolicies] = useState([]);
  const [type, setType] = useState('');
  const [carValue, setCarValue] = useState('');
  const [quotes, setQuotes] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = type ? `?type=${type}` : '';
    api(`/api/insurance${params}`).then(setPolicies).catch((e) => setError(e.message));
  }, [type]);

  async function getQuotes(e) {
    e.preventDefault();
    setError('');
    try {
      const res = await api('/api/insurance/quote', { method: 'POST', body: { carValueKes: Number(carValue) } });
      setQuotes(res.quotes);
    } catch (err) { setError(err.message); }
  }

  const shown = quotes || policies;

  return (
    <div className="page">
      <AdsBanner />
      <h1>Car Insurance in Kenya</h1>
      <p className="meta">Compare covers from Kenyan insurers. Comprehensive is priced as a % of your car's value; third party is a flat annual fee.</p>

      <form className="filters" onSubmit={getQuotes}>
        <input type="number" placeholder="Your car's value in KES e.g. 950000"
          value={carValue} onChange={(e) => setCarValue(e.target.value)} />
        <button className="btn" type="submit">Estimate My Premium</button>
        <select value={type} onChange={(e) => { setType(e.target.value); setQuotes(null); }}>
          <option value="">All Cover Types</option>
          <option value="COMPREHENSIVE">Comprehensive</option>
          <option value="THIRD_PARTY">Third Party Only</option>
        </select>
      </form>

      {error && <p className="error">{error}</p>}

      <div className="grid">
        {shown.map((p) => (
          <div className="card" key={p.id}>
            <h3>{p.company}</h3>
            <p><b>{p.name}</b> · {p.type === 'COMPREHENSIVE' ? 'Comprehensive' : 'Third Party'}</p>
            {p.estimatedAnnualPremiumKes != null ? (
              <p className="price">{kes(p.estimatedAnnualPremiumKes)} / year (estimate)</p>
            ) : (
              <p className="price">
                {p.annualRatePct ? `${p.annualRatePct}% of car value / year` : `${kes(p.flatAnnualKes)} / year`}
              </p>
            )}
            {p.minPremiumKes && <p className="meta">Minimum premium: {kes(p.minPremiumKes)}</p>}
            <ul>
              {p.features.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
            {p.website && <a className="btn secondary" href={p.website} target="_blank" rel="noreferrer">Visit {p.company}</a>}
          </div>
        ))}
      </div>
      <p className="meta">Estimates only — final premiums depend on valuation, car age and your claims history. Rates in the demo data are typical market figures; confirm with each insurer.</p>
    </div>
  );
}
