import { Text, View, StyleSheet } from 'react-native';
import { colors } from '../theme';

export default function VerifiedBadge({ verification }) {
  if (verification !== 'DEALER_VERIFIED' && verification !== 'ID_VERIFIED') return null;
  const isDealer = verification === 'DEALER_VERIFIED';
  return (
    <View style={[styles.badge, { backgroundColor: isDealer ? colors.badgeDealerBg : colors.badgeIdBg }]}>
      <Text style={[styles.text, { color: isDealer ? colors.greenDark : colors.badgeIdText }]}>
        ✔ {isDealer ? 'Verified Dealer' : 'ID Verified'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  text: { fontSize: 11, fontWeight: '700' },
});
