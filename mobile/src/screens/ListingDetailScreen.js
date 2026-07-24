// Full car details: swipeable photo gallery with counter + thumbnails,
// call/WhatsApp the seller, and owner controls (mark sold / delete).
import { useEffect, useRef, useState } from 'react';
import {
  View, Text, Image, ScrollView, FlatList, TouchableOpacity,
  StyleSheet, Linking, Dimensions, Alert,
} from 'react-native';
import { api, kes, mediaUrl, getUser } from '../api/client';
import { colors } from '../theme';
import VerifiedBadge from '../components/VerifiedBadge';
import Avatar from '../components/Avatar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_WIDTH = SCREEN_WIDTH - 28; // page padding

export default function ListingDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [listing, setListing] = useState(null);
  const [me, setMe] = useState(null);
  const [market, setMarket] = useState(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [error, setError] = useState('');
  const galleryRef = useRef(null);

  useEffect(() => {
    api(`/api/listings/${id}`).then((l) => {
      setListing(l);
      const p = new URLSearchParams({ make: l.make, model: l.model, year: String(l.year), condition: l.condition });
      api(`/api/market/price?${p}`).then(setMarket).catch(() => {});
    }).catch((e) => setError(e.message));
    getUser().then(setMe);
  }, [id]);

  if (error) return <Text style={styles.error}>{error}</Text>;
  if (!listing) return <Text style={styles.loading}>Loading…</Text>;

  const images = (listing.images || []).map(mediaUrl);
  const isOwner = me && listing.seller?.id === me.id;

  function jumpTo(i) {
    setPhotoIndex(i);
    galleryRef.current?.scrollToIndex({ index: i, animated: true });
  }

  async function toggleSold() {
    const status = listing.status === 'SOLD' ? 'AVAILABLE' : 'SOLD';
    try {
      await api(`/api/listings/${id}`, { method: 'PUT', body: { status } });
      setListing({ ...listing, status });
    } catch (e) { Alert.alert('Error', e.message); }
  }

  function deleteListing() {
    Alert.alert('Delete listing', 'Delete this listing permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await api(`/api/listings/${id}`, { method: 'DELETE' }); navigation.goBack(); }
          catch (e) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  }

  const specs = [
    ['Make', listing.make], ['Model', listing.model], ['Year', String(listing.year)],
    ['Mileage', `${Number(listing.mileageKm).toLocaleString()} km`],
    ['Engine', listing.engineCc ? `${listing.engineCc} cc` : '—'],
    ['Transmission', listing.transmission], ['Fuel', listing.fuelType],
    ['County', listing.county],
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 14 }}>
      {/* Swipeable photo gallery */}
      {images.length > 0 && (
        <View>
          <FlatList
            ref={galleryRef}
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(u, i) => String(i)}
            getItemLayout={(d, i) => ({ length: PHOTO_WIDTH, offset: PHOTO_WIDTH * i, index: i })}
            onMomentumScrollEnd={(e) => setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / PHOTO_WIDTH))}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={styles.photo} resizeMode="cover" />
            )}
          />
          {images.length > 1 && (
            <>
              <View style={styles.counter}>
                <Text style={styles.counterText}>{photoIndex + 1} / {images.length}</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbs}>
                {images.map((uri, i) => (
                  <TouchableOpacity key={i} onPress={() => jumpTo(i)}>
                    <Image source={{ uri }} style={[styles.thumb, i === photoIndex && styles.thumbActive]} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
        </View>
      )}

      <Text style={styles.title}>
        {listing.title} {listing.status === 'SOLD' ? '· 🏁 SOLD' : ''}
      </Text>
      <Text style={styles.price}>{kes(listing.priceKes)}</Text>

      {market && market.mid ? (() => {
        const p = listing.priceKes;
        const good = p < market.mid * 0.92, high = p > market.mid * 1.12;
        const verdict = good ? 'Below market — looks like a good deal'
          : high ? 'Above market — worth negotiating' : 'Around the market average — fair price';
        return (
          <View style={[styles.market, good && styles.marketGood, high && styles.marketHigh]}>
            <Text style={[styles.marketVerdict, good && { color: colors.greenDark }, high && { color: '#b45309' }]}>
              {verdict}
            </Text>
            <Text style={styles.meta}>Market range: {kes(market.low)} – {kes(market.high)}</Text>
            <Text style={styles.marketNote}>
              {market.basis === 'listings'
                ? `Based on ${market.sampleSize} similar cars on MagariHub.`
                : `Typical price ~${kes(market.mid)}.`} Varies with mileage & history.
            </Text>
          </View>
        );
      })() : null}

      {isOwner && (
        <View style={styles.ownerBar}>
          <Text style={styles.ownerLabel}>Your listing:</Text>
          <TouchableOpacity style={styles.ownerBtn} onPress={toggleSold}>
            <Text style={styles.ownerBtnText}>{listing.status === 'SOLD' ? '↩️ Mark Available' : '🏁 Mark Sold'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.ownerBtn, styles.dangerBtn]} onPress={deleteListing}>
            <Text style={[styles.ownerBtnText, { color: '#fff' }]}>🗑 Delete</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.specGrid}>
        {specs.map(([label, value]) => (
          <View key={label} style={styles.spec}>
            <Text style={styles.specLabel}>{label}</Text>
            <Text style={styles.specValue}>{value}</Text>
          </View>
        ))}
      </View>

      {listing.description ? <Text style={styles.desc}>{listing.description}</Text> : null}

      <View style={styles.sellerCard}>
        <TouchableOpacity style={styles.sellerRow}
          onPress={() => navigation.push('UserProfile', { id: listing.seller.id })}>
          <Avatar src={listing.seller.avatarUrl} name={listing.seller.name} size={44} />
          <View>
            <Text style={styles.sellerName}>{listing.seller.name}</Text>
            <VerifiedBadge verification={listing.seller.verification} />
            <Text style={styles.viewProfile}>View profile →</Text>
          </View>
        </TouchableOpacity>
        {listing.seller.phone ? (
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.btn} onPress={() => Linking.openURL(`tel:${listing.seller.phone}`)}>
              <Text style={styles.btnText}>📞 Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnAlt]}
              onPress={() => Linking.openURL(`https://wa.me/${listing.seller.phone.replace('+', '')}`)}>
              <Text style={[styles.btnText, { color: colors.greenDark }]}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <Text style={styles.tip}>Tip: verify the logbook on NTSA TIMS before paying anything.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loading: { padding: 20, color: colors.muted },
  error: { padding: 20, color: colors.red },
  photo: { width: PHOTO_WIDTH, height: 250, borderRadius: 12, backgroundColor: '#111' },
  counter: {
    position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999,
  },
  counterText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  thumbs: { marginTop: 8 },
  thumb: {
    width: 76, height: 54, borderRadius: 8, marginRight: 8,
    borderWidth: 2, borderColor: 'transparent', opacity: 0.75,
  },
  thumbActive: { borderColor: colors.green, opacity: 1 },
  title: { fontSize: 18, fontWeight: '800', marginTop: 12, color: colors.ink },
  price: { fontSize: 22, fontWeight: '800', color: colors.greenDark, marginVertical: 6 },
  market: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12, marginBottom: 10, gap: 3 },
  marketGood: { backgroundColor: 'rgba(15,157,88,0.08)', borderColor: 'rgba(15,157,88,0.3)' },
  marketHigh: { backgroundColor: 'rgba(255,159,10,0.08)', borderColor: 'rgba(255,159,10,0.35)' },
  marketVerdict: { fontWeight: '800', fontSize: 14, color: colors.ink },
  marketNote: { fontSize: 11, color: colors.muted },
  ownerBar: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center',
    borderWidth: 1, borderColor: colors.green, borderStyle: 'dashed',
    borderRadius: 10, padding: 10, marginBottom: 10, backgroundColor: colors.card,
  },
  ownerLabel: { fontSize: 12, color: colors.muted },
  ownerBtn: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: colors.green,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
  },
  dangerBtn: { backgroundColor: colors.red, borderColor: colors.red },
  ownerBtnText: { fontSize: 12, fontWeight: '700', color: colors.greenDark },
  specGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 10 },
  spec: {
    width: '48%', backgroundColor: colors.card, borderRadius: 8, padding: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  specLabel: { fontSize: 10, color: colors.muted, textTransform: 'uppercase' },
  specValue: { fontSize: 14, fontWeight: '600', color: colors.ink },
  desc: { lineHeight: 20, color: colors.ink, marginBottom: 12 },
  sellerCard: {
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border, marginBottom: 30, gap: 6,
  },
  sellerName: { fontWeight: '700', fontSize: 15 },
  sellerRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  viewProfile: { fontSize: 11, color: colors.greenDark, fontWeight: '700', marginTop: 2 },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btn: { backgroundColor: colors.green, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 18 },
  btnAlt: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.green },
  btnText: { color: '#fff', fontWeight: '700' },
  tip: { fontSize: 11, color: colors.muted, marginTop: 6 },
});
