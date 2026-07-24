// Design tokens — iOS 26 "Liquid Glass" inspired.
// Glass belongs on floating navigation layers (tab bar, headers, overlays);
// content surfaces stay solid so text stays crisp and readable.
export const colors = {
  green: '#0f9d58',
  greenDark: '#0a7d45',
  ink: '#0b0b0c',
  ink2: '#3c3c43',
  muted: '#86868b',        // Apple grey
  bg: '#f2f2f7',           // iOS grouped background
  card: '#ffffff',
  border: 'rgba(60,60,67,0.12)',
  red: '#ff3b30',          // iOS system red
  blue: '#0a84ff',
  amber: '#ff9f0a',
  pink: '#ff375f',
  badgeDealerBg: 'rgba(15,157,88,0.14)',
  badgeIdBg: 'rgba(10,132,255,0.14)',
  badgeIdText: '#0060df',
  // translucent layers
  glass: 'rgba(255,255,255,0.78)',
  glassDark: 'rgba(22,22,24,0.66)',
  glassBorder: 'rgba(255,255,255,0.18)',
};

// Continuous-corner radii
export const radii = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 };

// Soft depth (iOS-like: wide, low-opacity)
export const shadows = {
  sm: {
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  md: {
    shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 }, elevation: 5,
  },
};

export const spacing = { xs: 4, sm: 8, md: 14, lg: 20, xl: 28 };
