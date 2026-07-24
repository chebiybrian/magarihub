// Rotating "Sponsored" banner (same ads as the website).
import { useEffect, useState } from 'react';
import { TouchableOpacity, ImageBackground, Text, View, StyleSheet, Linking } from 'react-native';
import { api, mediaUrl } from '../api/client';
import { colors } from '../theme';
import KenyaFlag from './KenyaFlag';

// Web link paths -> mobile screens
const INTERNAL = {
  '/insurance': ['More', 'Insurance'],
  '/parts': ['More', 'Parts'],
  '/guides': ['More', 'Guides'],
};

export default function AdsBanner({ navigation }) {
  const [ads, setAds] = useState([]);
  const [i, setI] = useState(0);

  useEffect(() => { api('/api/ads').then(setAds).catch(() => {}); }, []);

  useEffect(() => {
    if (ads.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % ads.length), 5000);
    return () => clearInterval(t);
  }, [ads.length]);

  if (ads.length === 0) return null;
  const ad = ads[i];

  function open() {
    if (!ad.linkUrl) return;
    if (ad.linkUrl.startsWith('http')) Linking.openURL(ad.linkUrl);
    else if (INTERNAL[ad.linkUrl]) {
      const [tab, screen] = INTERNAL[ad.linkUrl];
      navigation.navigate(tab, { screen });
    }
  }

  const isFlag = ad.imageUrl === 'KENYA_FLAG'; // animated metallic flag slide

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={open} style={styles.wrap}>
      <ImageBackground source={isFlag ? undefined : { uri: mediaUrl(ad.imageUrl) }}
        style={styles.bg} imageStyle={{ borderRadius: 12 }}>
        {isFlag && <KenyaFlag />}
        <View style={styles.shade} />
        <Text style={styles.tag}>Sponsored</Text>
        <View style={styles.textWrap}>
          <Text style={styles.title}>{ad.title}</Text>
          {ad.text ? <Text style={styles.sub} numberOfLines={2}>{ad.text}</Text> : null}
          {ad.sponsor ? <Text style={styles.sponsor}>{ad.sponsor}</Text> : null}
        </View>
        <View style={styles.dots}>
          {ads.map((_, d) => <View key={d} style={[styles.dot, d === i && styles.dotOn]} />)}
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  bg: { minHeight: 110, borderRadius: 12, overflow: 'hidden', justifyContent: 'center' },
  shade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 12 },
  tag: {
    position: 'absolute', top: 8, right: 10, color: '#fff', fontSize: 10, fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999,
  },
  textWrap: { padding: 14, paddingRight: 60 },
  title: { color: '#fff', fontWeight: '800', fontSize: 15 },
  sub: { color: '#e8e8e8', fontSize: 12, marginTop: 3 },
  sponsor: { color: '#cfcfcf', fontSize: 10, marginTop: 4 },
  dots: { position: 'absolute', bottom: 8, right: 12, flexDirection: 'row', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotOn: { backgroundColor: '#fff' },
});
