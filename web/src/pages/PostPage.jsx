// "+ Post" page: sell a car, list a spare part, or share a reel.
// Photos/videos are uploaded from your computer (or paste links as a fallback).
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getToken, uploadFiles } from '../api/client';
import PhotoPicker from '../components/PhotoPicker';

const MAKES = ['Toyota', 'Mazda', 'Nissan', 'Subaru', 'Honda', 'Mitsubishi', 'Mercedes-Benz', 'BMW', 'Volkswagen', 'Suzuki', 'Isuzu', 'Other'];
const COUNTIES = ['Nairobi', 'Mombasa', 'Kiambu', 'Nakuru', 'Kisumu', 'Uasin Gishu', 'Machakos', 'Kajiado', 'Other'];

const parseLinks = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);

function CarForm({ onDone }) {
  const [f, setF] = useState({
    title: '', make: 'Toyota', model: '', year: '', priceKes: '', mileageKm: '',
    condition: 'FOREIGN_USED', transmission: 'Automatic', fuelType: 'Petrol',
    engineCc: '', county: 'Nairobi', description: '', links: '',
  });
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const uploaded = await uploadFiles(files); // real upload happens here
      await api('/api/listings', {
        method: 'POST',
        body: { ...f, images: [...uploaded, ...parseLinks(f.links)] },
      });
      onDone('/');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <form className="stack" onSubmit={submit}>
      <input placeholder="Title e.g. 2016 Toyota Vitz 1.3L — Fresh Import" value={f.title} onChange={set('title')} required />
      <div className="filters">
        <select value={f.make} onChange={set('make')}>{MAKES.map((m) => <option key={m}>{m}</option>)}</select>
        <input placeholder="Model e.g. Vitz" value={f.model} onChange={set('model')} required />
        <input type="number" placeholder="Year e.g. 2016" value={f.year} onChange={set('year')} required />
      </div>
      <div className="filters">
        <input type="number" placeholder="Price in KES" value={f.priceKes} onChange={set('priceKes')} required />
        <input type="number" placeholder="Mileage (km)" value={f.mileageKm} onChange={set('mileageKm')} />
        <input type="number" placeholder="Engine cc (optional)" value={f.engineCc} onChange={set('engineCc')} />
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
      <textarea rows="3" placeholder="Description — service history, extras, reason for sale…" value={f.description} onChange={set('description')} />

      <PhotoPicker files={files} setFiles={setFiles} label="📷 Car photos" />
      <input placeholder="…or paste photo links, separated by commas (optional)" value={f.links} onChange={set('links')} />

      {error && <p className="error">{error}</p>}
      <button className="btn" type="submit" disabled={busy}>
        {busy ? 'Uploading…' : 'Post Car for Sale'}
      </button>
    </form>
  );
}

function PartForm({ onDone }) {
  const [f, setF] = useState({ name: '', referenceNo: '', compatible: '', priceKes: '', condition: 'NEW', county: 'Nairobi', links: '' });
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const uploaded = await uploadFiles(files);
      await api('/api/parts', {
        method: 'POST',
        body: { ...f, images: [...uploaded, ...parseLinks(f.links)] },
      });
      onDone('/parts');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <form className="stack" onSubmit={submit}>
      <input placeholder="Part name e.g. Oil Filter — Toyota" value={f.name} onChange={set('name')} required />
      <input placeholder="Reference number e.g. 90915-YZZE1" value={f.referenceNo} onChange={set('referenceNo')} required />
      <input placeholder="Compatible with e.g. Toyota Vitz, Corolla 2005–2018" value={f.compatible} onChange={set('compatible')} />
      <div className="filters">
        <input type="number" placeholder="Price in KES" value={f.priceKes} onChange={set('priceKes')} required />
        <select value={f.condition} onChange={set('condition')}>
          <option value="NEW">New</option>
          <option value="USED_GENUINE">Used (Genuine)</option>
          <option value="REFURBISHED">Refurbished</option>
        </select>
        <select value={f.county} onChange={set('county')}>{COUNTIES.map((c) => <option key={c}>{c}</option>)}</select>
      </div>
      <PhotoPicker files={files} setFiles={setFiles} label="📷 Part photos" />
      <input placeholder="…or paste photo links (optional)" value={f.links} onChange={set('links')} />
      {error && <p className="error">{error}</p>}
      <button className="btn" type="submit" disabled={busy}>
        {busy ? 'Uploading…' : 'Post Part'}
      </button>
    </form>
  );
}

function ReelForm({ onDone }) {
  const [f, setF] = useState({ caption: '', listingId: '', link: '' });
  const [file, setFile] = useState(null);
  const [myCars, setMyCars] = useState([]);
  const [carsError, setCarsError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  // Load the user's own cars so they can pick one to attach (no ID typing needed)
  useEffect(() => {
    api('/api/listings/mine/all')
      .then((cars) => setMyCars(Array.isArray(cars) ? cars : []))
      .catch((e) => setCarsError(e.message));
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!file && !f.link) { setError('Choose a video file or paste a video link.'); return; }
    setBusy(true);
    try {
      let videoUrl = f.link;
      if (file) {
        const [url] = await uploadFiles([file]);
        videoUrl = url;
      }
      await api('/api/reels', {
        method: 'POST',
        body: { videoUrl, caption: f.caption, listingId: f.listingId || null },
      });
      onDone('/reels');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <form className="stack" onSubmit={submit}>
      <label className="file-label">
        🎬 Video file (mp4/mov/webm, max 100 MB)
        <input type="file" accept="video/*" onChange={(e) => setFile(e.target.files[0] || null)} />
      </label>
      {file && <p className="meta">Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</p>}
      <input placeholder="…or paste a video link (optional)" value={f.link} onChange={set('link')} />
      <input placeholder="Caption e.g. Fresh import walk-around 🔥" value={f.caption} onChange={set('caption')} />
      {/* Attach one of the user's own cars — shows a "View car" button on the reel */}
      <div className="attach-car">
        <b>🚗 Link this reel to one of your cars</b>
        <p className="meta">Optional — adds a "View car" button on your reel so viewers can jump straight to the listing.</p>
        <select value={f.listingId} onChange={set('listingId')}>
          <option value="">— Don't link a car —</option>
          {myCars.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title} — {c.status === 'SOLD' ? 'SOLD' : 'KES ' + Number(c.priceKes).toLocaleString()}
            </option>
          ))}
        </select>
        {carsError
          ? <p className="error">Couldn't load your cars: {carsError}</p>
          : myCars.length === 0 && <p className="meta">You haven't posted any cars yet — post a car first to link it here.</p>}
      </div>
      {error && <p className="error">{error}</p>}
      <button className="btn" type="submit" disabled={busy}>
        {busy ? 'Uploading… (videos can take a minute)' : 'Post Reel'}
      </button>
    </form>
  );
}

export default function PostPage() {
  const [tab, setTab] = useState('car');
  const navigate = useNavigate();

  useEffect(() => {
    if (!getToken()) navigate('/login'); // must be logged in to post
  }, []);

  const done = (path) => navigate(path);

  return (
    <div className="page narrow-wide">
      <h1>Post to MagariHub</h1>
      <div className="filters">
        <button className={`btn small ${tab === 'car' ? '' : 'secondary'}`} onClick={() => setTab('car')}>🚗 Sell a Car</button>
        <button className={`btn small ${tab === 'part' ? '' : 'secondary'}`} onClick={() => setTab('part')}>🔧 Sell a Part</button>
        <button className={`btn small ${tab === 'reel' ? '' : 'secondary'}`} onClick={() => setTab('reel')}>🎬 Post a Reel</button>
      </div>
      {tab === 'car' && <CarForm onDone={done} />}
      {tab === 'part' && <PartForm onDone={done} />}
      {tab === 'reel' && <ReelForm onDone={done} />}
    </div>
  );
}
