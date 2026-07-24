// User avatar: shows the profile photo, or colored initials if none is set.
import { mediaUrl } from '../api/client';

const COLORS = ['#1a7a3a', '#b45309', '#1e40af', '#9d174d', '#5b21b6', '#0e7490'];

export default function Avatar({ src, name = '?', size = 36 }) {
  const style = { width: size, height: size };
  if (src) {
    return <img className="avatar" src={mediaUrl(src)} alt={name} style={style} />;
  }
  const initials = name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  const bg = COLORS[(name.charCodeAt(0) || 0) % COLORS.length];
  return (
    <span className="avatar avatar-fallback" style={{ ...style, background: bg, fontSize: size * 0.38 }}>
      {initials}
    </span>
  );
}
