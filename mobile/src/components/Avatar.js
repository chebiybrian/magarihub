// User avatar: profile photo, or colored initials if none is set.
import { Image, View, Text } from 'react-native';
import { mediaUrl } from '../api/client';

const COLORS = ['#1a7a3a', '#b45309', '#1e40af', '#9d174d', '#5b21b6', '#0e7490'];

export default function Avatar({ src, name = '?', size = 36 }) {
  if (src) {
    return (
      <Image
        source={{ uri: mediaUrl(src) }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#ddd' }}
      />
    );
  }
  const initials = (name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('') || '?').toUpperCase();
  const bg = COLORS[(name.charCodeAt(0) || 0) % COLORS.length];
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2, backgroundColor: bg,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
}
