// Post tab: sell a car, list a part, or post a reel — with photos/videos
// picked straight from the phone gallery.
import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Image,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { api, getUser, uploadAssets } from '../api/client';
import { colors } from '../theme';

// Small selectable chip row used across the forms
function Chips({ options, value, onChange }) {
  return (
    <View style={styles.chips}>
      {options.map((o) => (
        <TouchableOpacity key={o} onPress={() => onChange(o)}
          style={[styles.chip, value === o && styles.chipActive]}>
          <Text style={[styles.chipText, value === o && styles.chipTextActive]}>{o}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const MAKES = ['Toyota', 'Mazda', 'Nissan', 'Subaru', 'Honda', 'BMW', 'Mercedes-Benz', 'Other'];
const COUNTIES = ['Nairobi', 'Mombasa', 'Kiambu', 'Nakuru', 'Kisumu', 'Uasin Gishu', 'Other'];

function CarForm({ navigation, showBusy }) {
  const [f, setF] = useState({
    title: '', make: 'Toyota', model: '', year: '', priceKes: '', mileageKm: '',
    condition: 'FOREIGN_USED', transmission: 'Automatic', fuelType: 'Petrol',
    county: 'Nairobi', description: '',
  });
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF({ ...f, [k]: v });

  async function pickPhotos() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 12,
      quality: 0.8,
    });
    if (!result.canceled) setPhotos((prev) => [...prev, ...result.assets].slice(0, 12));
  }

  async function submit() {
    if (!f.title || !f.model || !f.year || !f.priceKes) {
      return Alert.alert('Missing details', 'Title, model, year and price are required.');
    }
    setBusy(true);
    try {
      const images = await uploadAssets(photos);
      await api('/api/listings', { method: 'POST', body: { ...f, images } });
      Alert.alert('Posted! 🎉', 'Your car is now live on MagariHub.');
      navigation.navigate('Cars');
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setBusy(false); }
  }

  return (
    <View style={{ gap: 10 }}>
      <TextInput style={styles.input} placeholder="Title e.g. 2016 Toyota Vitz 1.3L — Fresh Import"
        value={f.title} onChangeText={set('title')} />
      <Chips options={MAKES} value={f.make} onChange={set('make')} />
      <View style={styles.row}>
        <TextInput style={[styles.input, { flex: 1 }]} placeholder="Model e.g. Vitz" value={f.model} onChangeText={set('model')} />
        <TextInput style={[styles.input, { width: 100 }]} placeholder="Year" keyboardType="numeric" value={f.year} onChangeText={set('year')} />
      </View>
      <View style={styles.row}>
        <TextInput style={[styles.input, { flex: 1 }]} placeholder="Price (KES)" keyboardType="numeric" value={f.priceKes} onChangeText={set('priceKes')} />
        <TextInput style={[styles.input, { flex: 1 }]} placeholder="Mileage (km)" keyboardType="numeric" value={f.mileageKm} onChangeText={set('mileageKm')} />
      </View>
      <Chips options={['FOREIGN_USED', 'LOCALLY_USED', 'NEW']} value={f.condition} onChange={set('condition')} />
      <Chips options={['Automatic', 'Manual']} value={f.transmission} onChange={set('transmission')} />
      <Chips options={['Petrol', 'Diesel', 'Hybrid', 'Electric']} value={f.fuelType} onChange={set('fuelType')} />
      <Chips options={COUNTIES} value={f.county} onChange={set('county')} />
      <TextInput style={[styles.input, { height: 80 }]} multiline placeholder="Description — service history, extras…"
        value={f.description} onChangeText={set('description')} />

      <TouchableOpacity style={styles.pickBtn} onPress={pickPhotos}>
        <Text style={styles.pickBtnText}>📷 Pick photos from gallery ({photos.length}/12)</Text>
      </TouchableOpacity>
      {photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {photos.map((p, i) => (
            <TouchableOpacity key={i} onLongPress={() => setPhotos(photos.filter((_, x) => x !== i))}>
              <Image source={{ uri: p.uri }} style={styles.preview} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      {photos.length > 0 && <Text style={styles.hint}>Long-press a photo to remove it</Text>}

      <TouchableOpacity style={[styles.submit, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Post Car for Sale</Text>}
      </TouchableOpacity>
    </View>
  );
}

function PartForm({ navigation }) {
  const [f, setF] = useState({ name: '', referenceNo: '', compatible: '', priceKes: '', condition: 'NEW', county: 'Nairobi' });
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF({ ...f, [k]: v });

  async function pickPhotos() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true, selectionLimit: 12, quality: 0.8,
    });
    if (!result.canceled) setPhotos((prev) => [...prev, ...result.assets].slice(0, 12));
  }

  async function submit() {
    if (!f.name || !f.referenceNo || !f.priceKes) {
      return Alert.alert('Missing details', 'Part name, reference number and price are required.');
    }
    setBusy(true);
    try {
      const images = await uploadAssets(photos);
      await api('/api/parts', { method: 'POST', body: { ...f, images } });
      Alert.alert('Posted! 🎉', 'Your part is now listed.');
      navigation.navigate('More', { screen: 'Parts' });
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setBusy(false); }
  }

  return (
    <View style={{ gap: 10 }}>
      <TextInput style={styles.input} placeholder="Part name e.g. Oil Filter — Toyota" value={f.name} onChangeText={set('name')} />
      <TextInput style={styles.input} placeholder="Reference no. e.g. 90915-YZZE1" autoCapitalize="characters"
        value={f.referenceNo} onChangeText={set('referenceNo')} />
      <TextInput style={styles.input} placeholder="Compatible with e.g. Vitz, Corolla 2005–2018"
        value={f.compatible} onChangeText={set('compatible')} />
      <TextInput style={styles.input} placeholder="Price (KES)" keyboardType="numeric" value={f.priceKes} onChangeText={set('priceKes')} />
      <Chips options={['NEW', 'USED_GENUINE', 'REFURBISHED']} value={f.condition} onChange={set('condition')} />
      <Chips options={COUNTIES} value={f.county} onChange={set('county')} />
      <TouchableOpacity style={styles.pickBtn} onPress={pickPhotos}>
        <Text style={styles.pickBtnText}>📷 Pick photos ({photos.length}/12)</Text>
      </TouchableOpacity>
      {photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {photos.map((p, i) => (
            <TouchableOpacity key={i} onLongPress={() => setPhotos(photos.filter((_, x) => x !== i))}>
              <Image source={{ uri: p.uri }} style={styles.preview} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      <TouchableOpacity style={[styles.submit, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Post Part</Text>}
      </TouchableOpacity>
    </View>
  );
}

function ReelForm({ navigation }) {
  const [video, setVideo] = useState(null);
  const [caption, setCaption] = useState('');
  const [listingId, setListingId] = useState('');
  const [myCars, setMyCars] = useState([]);
  const [busy, setBusy] = useState(false);

  // Load the user's own cars so they can tap one to attach (no ID typing)
  useEffect(() => {
    api('/api/listings/mine/all').then(setMyCars).catch(() => {});
  }, []);

  async function pickVideo() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.9,
    });
    if (!result.canceled) setVideo(result.assets[0]);
  }

  async function submit() {
    if (!video) return Alert.alert('No video', 'Pick a video from your gallery first.');
    setBusy(true);
    try {
      const [videoUrl] = await uploadAssets([video]);
      await api('/api/reels', { method: 'POST', body: { videoUrl, caption, listingId: listingId || null } });
      Alert.alert('Posted! 🎉', 'Your reel is live.');
      setVideo(null); setCaption(''); setListingId('');
      navigation.navigate('Reels');
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setBusy(false); }
  }

  return (
    <View style={{ gap: 10 }}>
      <TouchableOpacity style={styles.pickBtn} onPress={pickVideo}>
        <Text style={styles.pickBtnText}>
          {video ? `🎬 Video selected (${((video.fileSize || 0) / 1024 / 1024).toFixed(1) || '?'} MB) — tap to change` : '🎬 Pick a video from gallery'}
        </Text>
      </TouchableOpacity>
      <TextInput style={styles.input} placeholder="Caption e.g. Fresh import walk-around 🔥"
        value={caption} onChangeText={setCaption} />
      <View style={styles.attachCar}>
      <Text style={styles.attachTitle}>🚗 Link this reel to one of your cars</Text>
      <Text style={styles.hint}>Optional — adds a "View car" button on your reel.</Text>
      {myCars.length === 0 ? (
        <Text style={styles.hint}>You haven't posted any cars yet.</Text>
      ) : (
        <View style={styles.chips}>
          <TouchableOpacity onPress={() => setListingId('')}
            style={[styles.chip, !listingId && styles.chipActive]}>
            <Text style={[styles.chipText, !listingId && styles.chipTextActive]}>None</Text>
          </TouchableOpacity>
          {myCars.map((c) => (
            <TouchableOpacity key={c.id} onPress={() => setListingId(String(c.id))}
              style={[styles.chip, listingId === String(c.id) && styles.chipActive]}>
              <Text style={[styles.chipText, listingId === String(c.id) && styles.chipTextActive]} numberOfLines={1}>
                {c.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      </View>
      <TouchableOpacity style={[styles.submit, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Post Reel</Text>}
      </TouchableOpacity>
      {busy && <Text style={styles.hint}>Uploading video — this can take a minute…</Text>}
    </View>
  );
}

export default function PostScreen({ navigation }) {
  const [tab, setTab] = useState('car');
  const [me, setMe] = useState(undefined); // undefined = checking

  // Re-check login every time the tab is opened
  useFocusEffect(useCallback(() => { getUser().then((u) => setMe(u || null)); }, []));

  if (me === undefined) return <Text style={styles.loading}>Loading…</Text>;

  if (me === null) {
    return (
      <View style={styles.loginWall}>
        <Text style={styles.loginTitle}>Login to post</Text>
        <Text style={styles.hint}>You need an account to sell cars, list parts or post reels.</Text>
        <TouchableOpacity style={styles.submit} onPress={() => navigation.navigate('More', { screen: 'Login' })}>
          <Text style={styles.submitText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
      <View style={styles.tabs}>
        {[['car', '🚗 Car'], ['part', '🔧 Part'], ['reel', '🎬 Reel']].map(([key, label]) => (
          <TouchableOpacity key={key} onPress={() => setTab(key)}
            style={[styles.tabBtn, tab === key && styles.tabBtnActive]}>
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {tab === 'car' && <CarForm navigation={navigation} />}
      {tab === 'part' && <PartForm navigation={navigation} />}
      {tab === 'reel' && <ReelForm navigation={navigation} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loading: { padding: 20, color: colors.muted },
  loginWall: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 30, gap: 12 },
  loginTitle: { fontSize: 20, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tabBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: 'center',
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  tabBtnActive: { backgroundColor: colors.green, borderColor: colors.green },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.ink },
  tabTextActive: { color: '#fff' },
  input: {
    backgroundColor: colors.card, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: colors.border, fontSize: 14,
  },
  row: { flexDirection: 'row', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { fontSize: 12, color: colors.ink },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  pickBtn: {
    borderWidth: 2, borderColor: colors.green, borderStyle: 'dashed', borderRadius: 10,
    padding: 14, alignItems: 'center', backgroundColor: colors.card,
  },
  pickBtnText: { color: colors.greenDark, fontWeight: '700', fontSize: 13 },
  preview: { width: 90, height: 66, borderRadius: 8, marginRight: 8 },
  hint: { fontSize: 11, color: colors.muted, textAlign: 'center' },
  attachCar: {
    backgroundColor: 'rgba(15,157,88,0.06)', borderWidth: 1, borderStyle: 'dashed',
    borderColor: colors.green, borderRadius: 14, padding: 12, gap: 6,
  },
  attachTitle: { fontWeight: '700', fontSize: 14, color: colors.ink },
  submit: { backgroundColor: colors.green, borderRadius: 10, padding: 14, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
