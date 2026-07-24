// Multi-photo picker used by Post and Edit forms.
// - pick MANY photos at once in the file dialog (hold Ctrl / Shift)
// - pick again to ADD more — selections accumulate instead of replacing
// - drag & drop photos straight onto the box
// - ✕ removes a photo before upload
import { useRef, useState } from 'react';

const MAX = 12;

export default function PhotoPicker({ files, setFiles, label = '📷 Photos' }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  function addFiles(newList) {
    const incoming = Array.from(newList).filter((f) => f.type.startsWith('image/'));
    const merged = [...files];
    for (const f of incoming) {
      const duplicate = merged.some((m) => m.name === f.name && m.size === f.size);
      if (!duplicate) merged.push(f);
    }
    setFiles(merged.slice(0, MAX));
  }

  return (
    <div>
      <div
        className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
      >
        <b>{label}</b>
        <p className="meta">
          Click to choose photos — select many at once by holding <b>Ctrl</b> (or <b>Shift</b>) while clicking.
          You can also drag &amp; drop photos here, or come back and add more in batches. Up to {MAX} photos.
        </p>
        {files.length > 0 && <p className="meta"><b>{files.length}/{MAX} photos selected</b> — click to add more</p>}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
        />
      </div>

      {files.length > 0 && (
        <div className="preview-row">
          {files.map((file, i) => (
            <div key={`${file.name}-${file.size}-${i}`} className="kept-photo">
              <img src={URL.createObjectURL(file)} alt={file.name} />
              <button type="button" title="Remove this photo"
                onClick={() => setFiles(files.filter((_, x) => x !== i))}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
