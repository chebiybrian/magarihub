// Compare insurance policies + estimate annual premium from car value.
import { useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { api, kes } from '../api/client';
import { colors } from '../theme';

export default function InsuranceScreen() {
  const [policies, setPolicies] = useState([]);
  const [carValue, setCarValue] = useState('');
  const [quoted, setQuoted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/insurance').then(setPolicies).catch((e) => setError(e.message));
  }, []);

  async function getQuotes() {
    setError('');
    try {
      const res = await api('/api/insurance/quote', { method: 'POST', body: { carValueKes: Number(carValue) } });
      setPolicies(res.quotes);
      setQuoted(true);
    } catch (e) { setError(e.message); }
  }

  return (
    <View style={styles.container}>
      <View style={styles.quoteBox}>
        <TextInput
          style={styles.input}
          placeholder="Your car's value in KES e.g. 950000"
          keyboardType="numeric"
          value={carValue}
          onChangeText={setCarValue}
        />
        <TouchableOpacity style={styles.btn} onPress={getQuotes}>
          <Text style={styles.btnText}>Estimate</Text>
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={policies}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.company}>{item.company}</Text>
            <Text style={styles.meta}>{item.name} · {item.type === 'COMPREHENSIVE' ? 'Comprehensive' : 'Third Party'}</Text>
            <Text style={styles.price}>
              {quoted && item.estimatedAnnualPremiumKes != null
                ? `${kes(item.estimatedAnnualPremiumKes)} / year (estimate)`
                : item.annualRatePct
                  ? `${item.annualRatePct}% of car value / year`
                  : `${kes(item.flatAnnualKes)} / year`}
            </Text>
            {item.features.map((f, i) => <Text key={i} style={styles.feature}>• {f}</Text>)}
          </View>
        )}
        ListFooterComponent={
          <Text style={styles.disclaimer}>
            Estimates only — final premiums depend on valuation, car age and claims history.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  quoteBox: { flexDirection: 'row', gap: 8, padding: 12, paddingBottom: 0 },
  input: {
    flex: 1, backgroundColor: colors.card, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  btn: { backgroundColor: colors.green, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
  card: {
    backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  company: { fontSize: 16, fontWeight: '800', color: colors.ink },
  meta: { color: colors.muted, fontSize: 12, marginBottom: 4 },
  price: { color: colors.greenDark, fontWeight: '800', marginBottom: 6 },
  feature: { fontSize: 12, color: colors.ink, lineHeight: 18 },
  error: { color: colors.red, padding: 12 },
  disclaimer: { fontSize: 11, color: colors.muted, textAlign: 'center', marginVertical: 10 },
});
