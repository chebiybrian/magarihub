// "More" tab hub: insurance, guides, parts, profile/login.
import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getUser } from '../api/client';
import { colors } from '../theme';
import ContributeModal from '../components/ContributeModal';

const ITEMS = [
  ['PriceCheck', '💰', 'Market price of any car in Kenya', 'Market Price Check'],
  ['Insurance', '🛡️', 'Compare covers & estimate premiums'],
  ['Guides', '📖', 'Buying guides, NTSA, import rules & stats'],
  ['Parts', '🔧', 'Spares with reference numbers'],
];

export default function MoreScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [supportOpen, setSupportOpen] = useState(false);

  // Re-check login state every time this tab is opened
  useFocusEffect(useCallback(() => { getUser().then(setUser); }, []));

  return (
    <View style={styles.container}>
      <ContributeModal visible={supportOpen} onClose={() => setSupportOpen(false)} />
      {ITEMS.map(([screen, emoji, subtitle, label]) => (
        <TouchableOpacity key={screen} style={styles.item} onPress={() => navigation.navigate(screen)}>
          <Text style={styles.emoji}>{emoji}</Text>
          <View>
            <Text style={styles.title}>{label || screen}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.item} onPress={() => navigation.navigate(user ? 'Profile' : 'Login')}>
        <Text style={styles.emoji}>👤</Text>
        <View>
          <Text style={styles.title}>{user ? user.name : 'Login / Register'}</Text>
          <Text style={styles.subtitle}>{user ? 'My profile & verification badge' : 'Sign in to sell cars or post reels'}</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.item, styles.support]} onPress={() => setSupportOpen(true)}>
        <Text style={styles.emoji}>❤️</Text>
        <View>
          <Text style={styles.title}>Support MagariHub</Text>
          <Text style={styles.subtitle}>Contribute any amount to keep the app free</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 14, gap: 10 },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.card, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  support: { borderColor: '#f5c2cc', backgroundColor: '#fff5f7' },
  emoji: { fontSize: 26 },
  title: { fontSize: 16, fontWeight: '700', color: colors.ink },
  subtitle: { fontSize: 12, color: colors.muted },
});
