// Photo slideshow for listing pages:
// - big main image (full quality, no cropping) with ‹ › arrows and a counter
// - thumbnail strip to jump between photos
// - click the main image for a fullscreen zoom (arrow keys navigate, Esc closes)
import { useEffect, useState } from 'react';

export default function PhotoSlideshow({ images }) {
  const [i, setI] = useState(0);
  const [full, setFull] = useState(false);
  const n = images.length;

  // Keyboard navigation while fullscreen
  useEffect(() => {
    if (!full) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setFull(false);
      if (e.key === 'ArrowLeft') setI((x) => (x - 1 + n) % n);
      if (e.key === 'ArrowRight') setI((x) => (x + 1) % n);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [full, n]);

  if (n === 0) return null;

  const prev = (e) => { e.stopPropagation(); setI((i - 1 + n) % n); };
  const next = (e) => { e.stopPropagation(); setI((i + 1) % n); };

  return (
    <div className="slideshow">
      <div className="slide-main" onClick={() => setFull(true)} title="Click to view full size">
        <img src={images[i]} alt={`Photo ${i + 1}`} />
        {n > 1 && (
          <>
            <button className="slide-arrow left" onClick={prev} aria-label="Previous photo">‹</button>
            <button className="slide-arrow right" onClick={next} aria-label="Next photo">›</button>
            <span className="slide-counter">{i + 1} / {n}</span>
          </>
        )}
      </div>

      {n > 1 && (
        <div className="slide-thumbs">
          {images.map((src, idx) => (
            <img
              key={idx}
              src={src}
              alt={`Thumbnail ${idx + 1}`}
              className={idx === i ? 'active' : ''}
              onClick={() => setI(idx)}
            />
          ))}
        </div>
      )}

      {full && (
        <div className="lightbox" onClick={() => setFull(false)}>
          <button className="lightbox-close" onClick={() => setFull(false)} aria-label="Close">✕</button>
          {n > 1 && <button className="slide-arrow left" onClick={prev}>‹</button>}
          <img src={images[i]} alt={`Photo ${i + 1} full size`} onClick={(e) => e.stopPropagation()} />
          {n > 1 && <button className="slide-arrow right" onClick={next}>›</button>}
          {n > 1 && <span className="slide-counter">{i + 1} / {n}</span>}
        </div>
      )}
    </div>
  );
}
