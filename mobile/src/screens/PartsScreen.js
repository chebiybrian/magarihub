// Car parts search by name or reference number.
import { useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { api, kes } from '../api/client';
import { colors } from '../theme';
import VerifiedBadge from '../components/VerifiedBadge';

export default function PartsScreen() {
  const [parts, setParts] = useState([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  async function load(query = '') {
    try {
      // One search box: matches part names AND reference numbers
      const byName = await api(`/api/parts?q=${encodeURIComponent(query)}`);
      if (query && byName.length === 0) {
        setParts(await api(`/api/parts?ref=${encodeURIComponent(query)}`));
      } else {
        setParts(byName);
      }
      setError('');
    } catch (e) { setError(e.message); }
  }

  useEffect(() => { load(); }, []);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search part name or ref no. e.g. 90915-YZZE1"
        value={q}
        onChangeText={setQ}
        onSubmitEditing={() => load(q)}
        returnKeyType="search"
        autoCapitalize="characters"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={parts}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.ref}>Ref: {item.referenceNo}</Text>
            <Text style={styles.price}>{kes(item.priceKes)}</Text>
            <Text style={styles.meta}>Fits: {item.compatible}</Text>
            <View style={styles.row}>
              <Text style={styles.meta}>{item.condition.replace('_', ' ')} · {item.county} · {item.seller?.name} </Text>
              <VerifiedBadge verification={item.seller?.verification} />
            </View>
            {item.seller?.phone ? (
              <TouchableOpacity style={styles.btn} onPress={() => Linking.openURL(`tel:${item.seller.phone}`)}>
                <Text style={styles.btnText}>📞 Call Seller</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
        ListEmptyComponent={!error ? <Text style={styles.empty}>No parts found.</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  search: {
    margin: 12, backgroundColor: colors.card, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  card: {
    backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border, gap: 3,
  },
  name: { fontSize: 15, fontWeight: '700', color: colors.ink },
  ref: { fontFamily: 'monospace', fontSize: 12, color: colors.greenDark },
  price: { color: colors.greenDark, fontWeight: '800' },
  meta: { color: colors.muted, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  btn: { backgroundColor: colors.green, borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '700' },
  error: { color: colors.red, padding: 12 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40 },
});
