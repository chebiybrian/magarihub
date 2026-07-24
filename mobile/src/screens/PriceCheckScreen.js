// Market Price Check — approximate what a car costs in Kenya.
import { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { api, kes } from '../api/client';
import { colors } from '../theme';

const MAKES = ['Toyota', 'Mazda', 'Nissan', 'Subaru', 'Honda', 'Mitsubishi', 'BMW', 'Mercedes-Benz', 'Suzuki'];
const YEARS = Array.from({ length: 25 }, (_, i) => String(2026 - i));
const CONDITIONS = [['LOCALLY_USED', 'Locally Used'], ['FOREIGN_USED', 'Foreign Used'], ['NEW', 'Brand New']];

function Picker({ options, value, onChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
      {options.map((o) => {
        const val = Array.isArray(o) ? o[0] : o;
        const label = Array.isArray(o) ? o[1] : o;
        return (
          <TouchableOpacity key={val} onPress={() => onChange(val)}
            style={[styles.chip, value === val && styles.chipOn]}>
            <Text style={[styles.chipText, value === val && { color: '#fff' }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export default function PriceCheckScreen() {
  const [make, setMake] = useState('Toyota');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('2015');
  const [condition, setCondition] = useState('LOCALLY_USED');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function check() {
    if (!model.trim()) return setError('Enter the model, e.g. Axio');
    setError(''); setLoading(true); setResult(null);
    try {
      const p = new URLSearchParams({ make, model, year, condition });
      setResult(await api(`/api/market/price?${p}`));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.intro}>
        Find the approximate price a car goes for in Kenya — before you buy or when setting your asking price.
      </Text>

      <Text style={styles.label}>Make</Text>
      <Picker options={MAKES} value={make} onChange={setMake} />
      <TextInput style={styles.input} placeholder="Model e.g. Axio, Vitz, Note"
        value={model} onChangeText={setModel} />
      <Text style={styles.label}>Year</Text>
      <Picker options={YEARS} value={year} onChange={setYear} />
      <Text style={styles.label}>Condition</Text>
      <Picker options={CONDITIONS} value={condition} onChange={setCondition} />

      <TouchableOpacity style={styles.btn} onPress={check}>
        <Text style={styles.btnText}>Check Price</Text>
      </TouchableOpacity>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={colors.green} style={{ marginTop: 16 }} /> : null}

      {result && (
        <View style={styles.card}>
          <Text style={styles.meta}>
            Estimated range · {result.year} {result.make} {result.model}
          </Text>
          {result.mid ? (
            <>
              <View style={styles.rangeRow}>
                <View style={styles.rangeCol}><Text style={styles.meta}>Low</Text><Text style={styles.rangeVal}>{kes(result.low)}</Text></View>
                <View style={styles.rangeCol}><Text style={styles.meta}>Typical</Text><Text style={styles.rangeMid}>{kes(result.mid)}</Text></View>
                <View style={styles.rangeCol}><Text style={styles.meta}>High</Text><Text style={styles.rangeVal}>{kes(result.high)}</Text></View>
              </View>
              <View style={styles.gradBar} />
            </>
          ) : (
            <Text style={styles.p}>{result.note}</Text>
          )}
          <Text style={styles.note}>
            {result.basis === 'listings' ? '📊 ' : 'ℹ️ '}{result.note} Actual prices vary with mileage, history and extras.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  intro: { fontSize: 13, color: colors.muted, marginBottom: 12, lineHeight: 18 },
  label: { fontSize: 12, color: colors.muted, marginTop: 8 },
  input: { backgroundColor: colors.card, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.border, fontSize: 15, marginTop: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginRight: 6 },
  chipOn: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { fontSize: 12, color: colors.ink },
  btn: { backgroundColor: colors.green, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 14 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginTop: 16, borderWidth: 1, borderColor: colors.border },
  meta: { fontSize: 12, color: colors.muted },
  p: { fontSize: 14, color: colors.ink, marginVertical: 8 },
  rangeRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10 },
  rangeCol: { alignItems: 'center', gap: 2 },
  rangeVal: { fontSize: 15, fontWeight: '700', color: colors.ink },
  rangeMid: { fontSize: 20, fontWeight: '800', color: colors.greenDark },
  gradBar: { height: 6, borderRadius: 4, backgroundColor: '#f5b301' },
  note: { fontSize: 11, color: colors.muted, marginTop: 12, lineHeight: 16 },
  error: { color: colors.red, marginTop: 10 },
});
