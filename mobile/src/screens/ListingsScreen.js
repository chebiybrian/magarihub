// Unified Cars tab: filters + price slider + MagariHub results + deep links
// into other platforms (Jiji, Kai & Karo, BeForward, etc.) — all in one search.
import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Linking, PanResponder,
} from 'react-native';
import { api } from '../api/client';
import { colors } from '../theme';
import ListingCard from '../components/ListingCard';
import AdsBanner from '../components/AdsBanner';

const MAKES = ['All', 'Toyota', 'Mazda', 'Nissan', 'Subaru', 'Honda', 'BMW', 'Mercedes-Benz'];
const PRICE_MAX = 10000000; // KES 10M
const fmtPrice = (v) => v >= PRICE_MAX ? 'KES 10M+' : `KES ${(v / 1000000).toFixed(2)}M`;

// Dual-handle price slider (PanResponder, no extra package)
function PriceSlider({ minPrice, maxPrice, setMinPrice, setMaxPrice, onDone }) {
  const [width, setWidth] = useState(0);
  const val2x = (v) => (v / PRICE_MAX) * width;
  const x2val = (x) => Math.round(Math.max(0, Math.min(width, x)) / width * PRICE_MAX / 50000) * 50000;

  const minResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => setMinPrice(Math.min(x2val(g.moveX - 24), maxPrice - 50000)),
    onPanResponderRelease: onDone,
  })).current;

  const maxResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => setMaxPrice(Math.max(x2val(g.moveX - 24), minPrice + 50000)),
    onPanResponderRelease: onDone,
  })).current;

  return (
    <View style={s.sliderWrap}>
      <View style={s.sliderLabels}>
        <Text style={s.sliderLabel}>Price range</Text>
        <Text style={s.sliderValue}>{fmtPrice(minPrice)} — {fmtPrice(maxPrice)}</Text>
      </View>
      {/* Type exact amounts */}
      <View style={s.inputRow}>
        <Text style={s.sliderLabel}>KES</Text>
        <TextInput
          style={s.priceInput} keyboardType="numeric" placeholder="Min"
          value={minPrice ? String(minPrice) : ''}
          onChangeText={(v) => setMinPrice(Math.min(Number(v) || 0, PRICE_MAX - 50000))}
          onEndEditing={onDone}
        />
        <Text style={s.sliderLabel}>to</Text>
        <TextInput
          style={s.priceInput} keyboardType="numeric" placeholder="Any"
          value={maxPrice >= PRICE_MAX ? '' : String(maxPrice)}
          onChangeText={(v) => setMaxPrice(Number(v) || PRICE_MAX)}
          onEndEditing={onDone}
        />
      </View>
      <View style={s.sliderTrack} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <View style={s.sliderBg} />
        {width > 0 && (
          <>
            <View style={[s.sliderFill, { left: val2x(minPrice), width: val2x(maxPrice) - val2x(minPrice) }]} />
            <View {...minResponder.panHandlers} style={[s.sliderThumb, { left: val2x(minPrice) - 11 }]} />
            <View {...maxResponder.panHandlers} style={[s.sliderThumb, { left: val2x(maxPrice) - 11 }]} />
          </>
        )}
      </View>
    </View>
  );
}

export default function ListingsScreen({ navigation }) {
  const [q, setQ] = useState('');
  const [make, setMake] = useState('All');
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(PRICE_MAX);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (make !== 'All') params.set('make', make);
      if (minPrice > 0) params.set('minPrice', minPrice);
      if (maxPrice < PRICE_MAX) params.set('maxPrice', maxPrice);
      setResult(await api(`/api/aggregate/search?${params}`));
    } catch (e) {
      setError(`${e.message} — check API_URL in src/api/client.js`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [make]);

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <AdsBanner navigation={navigation} />

      <TextInput
        style={s.search}
        placeholder="Search e.g. Vitz, Prado, hybrid…"
        value={q}
        onChangeText={setQ}
        onSubmitEditing={load}
        returnKeyType="search"
      />
      <View style={s.chips}>
        {MAKES.map((m) => (
          <TouchableOpacity key={m} onPress={() => setMake(m)}
            style={[s.chip, make === m && s.chipActive]}>
            <Text style={[s.chipText, make === m && s.chipTextActive]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <PriceSlider
        minPrice={minPrice} maxPrice={maxPrice}
        setMinPrice={setMinPrice} setMaxPrice={setMaxPrice} onDone={load}
      />

      {error ? <Text style={s.error}>{error}</Text> : null}

      {result && (
        <>
          <View style={s.heading}>
            <View style={[s.dot, { backgroundColor: '#1a7a3a' }]} />
            <Text style={s.headingText}>On MagariHub ({result.magarihub.length})</Text>
          </View>
          {result.magarihub.length === 0 ? (
            <Text style={s.meta}>No matches here — try the platforms below.</Text>
          ) : (
            result.magarihub.map((l) => (
              <ListingCard
                key={l.id}
                listing={{ ...l, images: l.imageUrl ? [l.imageUrl] : [] }}
                onPress={() => navigation.navigate('ListingDetail', { id: l.id })}
              />
            ))
          )}

          <View style={s.heading}>
            <Text style={s.headingText}>Also search these platforms</Text>
          </View>
          {result.external.map((src) => (
            <TouchableOpacity key={src.source} style={[s.srcCard, { borderLeftColor: src.sourceColor }]}
              onPress={() => Linking.openURL(src.url)}>
              <View style={s.srcHead}>
                <View style={[s.dot, { backgroundColor: src.sourceColor }]} />
                <Text style={s.srcName}>{src.sourceName}</Text>
                <Text style={s.srcTag}>{src.country}</Text>
              </View>
              <Text style={s.meta}>{src.note}</Text>
              <Text style={[s.srcGo, { color: src.sourceColor }]}>Search here →</Text>
            </TouchableOpacity>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  search: {
    backgroundColor: colors.card, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: colors.border, marginBottom: 8,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { fontSize: 12, color: colors.ink },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  error: { color: colors.red, paddingTop: 8 },
  meta: { fontSize: 12, color: colors.muted },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, marginBottom: 8 },
  headingText: { fontSize: 16, fontWeight: '800', color: colors.ink },
  dot: { width: 12, height: 12, borderRadius: 6 },
  srcCard: {
    backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4, gap: 4,
  },
  srcHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  srcName: { fontSize: 15, fontWeight: '800', color: colors.ink, flex: 1 },
  srcTag: { fontSize: 10, color: colors.muted, backgroundColor: colors.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  srcGo: { fontWeight: '800', fontSize: 12, marginTop: 4 },
  // slider
  sliderWrap: { marginTop: 14 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  priceInput: {
    flex: 1, backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 9, borderWidth: 1, borderColor: colors.border, fontSize: 14,
  },
  sliderLabel: { fontSize: 13, color: colors.muted },
  sliderValue: { fontSize: 13, fontWeight: '800', color: colors.greenDark },
  sliderTrack: { height: 28, justifyContent: 'center' },
  sliderBg: { position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 4, backgroundColor: colors.border },
  sliderFill: { position: 'absolute', height: 4, borderRadius: 4, backgroundColor: colors.green },
  sliderThumb: {
    position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff',
    borderWidth: 3, borderColor: colors.green, elevation: 3,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
  },
});
