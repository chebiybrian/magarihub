// Feature 5: guides, news and statistics about the Kenyan car market.
import { useEffect, useState } from 'react';
import { api } from '../api/client';

const CATEGORIES = [
  ['', 'All'],
  ['BUYING_GUIDE', 'Buying Guides'],
  ['IMPORT', 'Importing'],
  ['NTSA', 'NTSA & Logbooks'],
  ['INSURANCE', 'Insurance'],
  ['STATISTICS', 'Statistics'],
  ['NEWS', 'News'],
];

export default function GuidesPage() {
  const [guides, setGuides] = useState([]);
  const [category, setCategory] = useState('');
  const [openGuide, setOpenGuide] = useState(null); // full article being read
  const [error, setError] = useState('');

  useEffect(() => {
    const params = category ? `?category=${category}` : '';
    api(`/api/guides${params}`).then(setGuides).catch((e) => setError(e.message));
  }, [category]);

  async function open(id) {
    try { setOpenGuide(await api(`/api/guides/${id}`)); } catch (e) { setError(e.message); }
  }

  if (openGuide) {
    return (
      <div className="page article">
        <button className="btn small" onClick={() => setOpenGuide(null)}>← All guides</button>
        <h1>{openGuide.title}</h1>
        <p className="meta">{new Date(openGuide.createdAt).toLocaleDateString('en-KE', { dateStyle: 'long' })}</p>
        {/* Content is stored as markdown-ish text; rendered simply here.
            Later: npm install react-markdown for proper rendering. */}
        <div className="article-body">
          {openGuide.content.split('\n').map((line, i) =>
            line.startsWith('## ') ? <h2 key={i}>{line.slice(3)}</h2>
            : line.startsWith('- ') ? <li key={i}>{line.slice(2)}</li>
            : line.trim() ? <p key={i}>{line}</p> : null
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Guides & Market Info</h1>
      <div className="filters">
        {CATEGORIES.map(([value, label]) => (
          <button key={value} onClick={() => setCategory(value)}
            className={`btn small ${category === value ? '' : 'secondary'}`}>
            {label}
          </button>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      <div className="grid">
        {guides.map((g) => (
          <div className="card guide-card" key={g.id} onClick={() => open(g.id)}>
            <span className="badge badge-id">{g.category.replace('_', ' ')}</span>
            <h3>{g.title}</h3>
            <p>{g.summary}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
