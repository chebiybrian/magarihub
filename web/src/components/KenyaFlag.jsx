// Kenyan flag with a smooth flowing wave and a metallic finish.
//
// The wave is a single low-frequency noise field (one octave = large, rounded
// swells rather than jitter) that is SCROLLED horizontally, so the folds travel
// across the flag like wind instead of shimmering in place.
export default function KenyaFlag() {
  return (
    <svg className="ke-flag" viewBox="0 0 900 300" preserveAspectRatio="xMidYMid slice" aria-label="Flag of Kenya">
      <defs>
        <filter id="keWave" x="-15%" y="-15%" width="130%" height="130%">
          {/* One octave + low frequency = smooth rolling swells */}
          <feTurbulence type="fractalNoise" baseFrequency="0.0035 0.009"
            numOctaves="1" seed="4" result="swell" />
          {/* Scroll the field so the wave travels across the cloth */}
          <feOffset in="swell" dx="0" dy="0" result="moving">
            <animate attributeName="dx" values="0;300;600" dur="14s" repeatCount="indefinite" />
          </feOffset>
          <feDisplacementMap in="SourceGraphic" in2="moving" scale="14"
            xChannelSelector="R" yChannelSelector="G" />
        </filter>

        {/* Soft folds that drift with the wave — gives the metal its depth */}
        <linearGradient id="keFolds" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#000" stopOpacity="0.22" />
          <stop offset="20%"  stopColor="#fff" stopOpacity="0.20" />
          <stop offset="40%"  stopColor="#000" stopOpacity="0.20" />
          <stop offset="60%"  stopColor="#fff" stopOpacity="0.22" />
          <stop offset="80%"  stopColor="#000" stopOpacity="0.20" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0.16" />
          <animate attributeName="x1" values="-0.35;0;-0.35" dur="14s" repeatCount="indefinite" />
          <animate attributeName="x2" values="0.65;1;0.65" dur="14s" repeatCount="indefinite" />
        </linearGradient>

        {/* Slow polished highlight drifting across */}
        <linearGradient id="keSheen" x1="-0.5" y1="0" x2="-0.1" y2="1">
          <stop offset="0%"   stopColor="#fff" stopOpacity="0" />
          <stop offset="50%"  stopColor="#fff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          <animate attributeName="x1" values="-0.5;1.3" dur="9s" repeatCount="indefinite" />
          <animate attributeName="x2" values="-0.1;1.7" dur="9s" repeatCount="indefinite" />
        </linearGradient>

        <linearGradient id="keGloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#fff" stopOpacity="0.26" />
          <stop offset="45%"  stopColor="#fff" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.26" />
        </linearGradient>
      </defs>

      <g filter="url(#keWave)">
        {/* Bands: black, white, red, white, green */}
        <rect x="0" y="0"   width="900" height="60"  fill="#0b0b0b" />
        <rect x="0" y="60"  width="900" height="18"  fill="#f5f5f5" />
        <rect x="0" y="78"  width="900" height="144" fill="#c8102e" />
        <rect x="0" y="222" width="900" height="18"  fill="#f5f5f5" />
        <rect x="0" y="240" width="900" height="60"  fill="#0f7b3d" />

        {/* Crossed Maasai spears + shield */}
        <g transform="translate(450 150)">
          <g stroke="#f2efe6" strokeWidth="7" strokeLinecap="round">
            <line x1="-70" y1="-108" x2="70" y2="108" />
            <line x1="70" y1="-108" x2="-70" y2="108" />
          </g>
          <path d="M-78 -120 L-64 -96 L-88 -100 Z" fill="#f2efe6" />
          <path d="M78 -120 L64 -96 L88 -100 Z" fill="#f2efe6" />
          <path d="M78 120 L64 96 L88 100 Z" fill="#f2efe6" />
          <path d="M-78 120 L-64 96 L-88 100 Z" fill="#f2efe6" />

          <ellipse cx="0" cy="0" rx="46" ry="96" fill="#c8102e" stroke="#0b0b0b" strokeWidth="4" />
          <path d="M0 -96 a46 96 0 0 1 0 192 z" fill="#0b0b0b" opacity="0.92" />
          <ellipse cx="0" cy="0" rx="30" ry="62" fill="#f2efe6" />
          <ellipse cx="0" cy="0" rx="17" ry="42" fill="#c8102e" />
          <path d="M0 -42 a17 42 0 0 1 0 84 z" fill="#0b0b0b" opacity="0.85" />
        </g>

        {/* Metal passes */}
        <rect x="0" y="0" width="900" height="300" fill="url(#keFolds)" style={{ mixBlendMode: 'overlay' }} />
        <rect x="0" y="0" width="900" height="300" fill="url(#keGloss)" style={{ mixBlendMode: 'soft-light' }} />
        <rect x="0" y="0" width="900" height="300" fill="url(#keSheen)" style={{ mixBlendMode: 'screen' }} />
      </g>
    </svg>
  );
}
