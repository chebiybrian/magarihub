import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { kes, mediaUrl } from '../api/client';
import { colors } from '../theme';
import VerifiedBadge from './VerifiedBadge';

export default function ListingCard({ listing, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View>
        <Image source={{ uri: mediaUrl(listing.images?.[0]) }} style={styles.image} />
        {listing.images?.length > 1 && (
          <View style={styles.photoCount}>
            <Text style={styles.photoCountText}>📷 {listing.images.length}</Text>
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{listing.title}</Text>
        <Text style={styles.price}>{kes(listing.priceKes)}</Text>
        <Text style={styles.meta}>
          {listing.year} · {Number(listing.mileageKm).toLocaleString()} km · {listing.county}
        </Text>
        <View style={styles.sellerRow}>
          <Text style={styles.meta}>{listing.seller?.name} </Text>
          <VerifiedBadge verification={listing.seller?.verification} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card, borderRadius: 12, marginBottom: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border,
  },
  image: { width: '100%', height: 180 },
  body: { padding: 12 },
  title: { fontSize: 15, fontWeight: '700', color: colors.ink },
  price: { color: colors.greenDark, fontWeight: '800', fontSize: 16, marginVertical: 4 },
  meta: { color: colors.muted, fontSize: 12 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  photoCount: {
    position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  photoCountText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
