// Market Price Check — approximate what a car should cost in Kenya.
import { useState } from 'react';
import { api, kes } from '../api/client';

const MAKES = ['Toyota', 'Mazda', 'Nissan', 'Subaru', 'Honda', 'Mitsubishi', 'Volkswagen', 'Mercedes-Benz', 'BMW', 'Suzuki', 'Isuzu'];
const YEARS = Array.from({ length: 25 }, (_, i) => 2026 - i);

export default function PriceCheckPage() {
  const [f, setF] = useState({ make: 'Toyota', model: '', year: '2015', condition: 'LOCALLY_USED' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function check(e) {
    e.preventDefault();
    if (!f.model.trim()) return setError('Enter the model, e.g. Axio');
    setError(''); setLoading(true); setResult(null);
    try {
      const params = new URLSearchParams(f);
      setResult(await api(`/api/market/price?${params}`));
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="page narrow-wide">
      <h1>Market Price Check 💰</h1>
      <p className="meta">
        Find the approximate price a car goes for in Kenya — before you buy or when setting your asking price.
      </p>

      <form className="stack" onSubmit={check}>
        <div className="filters">
          <select value={f.make} onChange={set('make')}>{MAKES.map((m) => <option key={m}>{m}</option>)}</select>
          <input placeholder="Model e.g. Axio, Vitz, Note" value={f.model} onChange={set('model')} />
          <select value={f.year} onChange={set('year')}>{YEARS.map((y) => <option key={y}>{y}</option>)}</select>
          <select value={f.condition} onChange={set('condition')}>
            <option value="LOCALLY_USED">Locally Used</option>
            <option value="FOREIGN_USED">Foreign Used</option>
            <option value="NEW">Brand New</option>
          </select>
        </div>
        <button className="btn" type="submit">Check Price</button>
      </form>

      {error && <p className="error">{error}</p>}
      {loading && <p>Checking the market…</p>}

      {result && (
        <div className="price-result card">
          <p className="meta">Estimated market range for a {result.year} {result.make} {result.model} ({result.condition.replace('_', ' ').toLowerCase()})</p>
          {result.mid ? (
            <>
              <div className="price-range-display">
                <div><span className="meta">Low</span><b>{kes(result.low)}</b></div>
                <div className="price-mid"><span className="meta">Typical</span><b>{kes(result.mid)}</b></div>
                <div><span className="meta">High</span><b>{kes(result.high)}</b></div>
              </div>
              <div className="price-bar"><div className="price-bar-fill" /></div>
            </>
          ) : (
            <p>{result.note}</p>
          )}
          <p className="meta price-note">
            {result.basis === 'listings' ? '📊 ' : 'ℹ️ '}{result.note} These are estimates — actual prices vary with
            mileage, service history, accident record and extras.
          </p>
        </div>
      )}
    </div>
  );
}
