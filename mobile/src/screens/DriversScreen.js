// Drivers for hire — only AI-vetted (licence verified) drivers are listed.
// Tap "Become a Driver" to apply by uploading your driving licence.
import { useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Linking, RefreshControl,
  Modal, ScrollView, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api, kes, getUser, uploadAssets, updateStoredUser } from '../api/client';
import { colors } from '../theme';
import Avatar from '../components/Avatar';

const COUNTIES = ['Nairobi', 'Mombasa', 'Kiambu', 'Nakuru', 'Kisumu', 'Uasin Gishu'];

function DriverApplication({ visible, onClose, onVerified }) {
  const [f, setF] = useState({ typedName: '', dailyRateKes: '', county: 'Nairobi', yearsExperience: '', about: '', hasPsvBadge: false });
  const [file, setFile] = useState(null);
  const [live, setLive] = useState(false);
  const [stage, setStage] = useState('form'); // form | vetting | verified | rejected
  const [result, setResult] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');
  const timerRef = useRef(null);
  const set = (k, v) => setF({ ...f, [k]: v });

  useEffect(() => {
    if (visible) { setStage('form'); setError(''); setFile(null); }
    api('/api/drivers/vetting-status').then((s) => setLive(s.live)).catch(() => {});
    return () => clearInterval(timerRef.current);
  }, [visible]);

  async function pickLicence() {
    // Licence photo from gallery (PDF upload is available on web)
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
    if (!r.canceled) setFile(r.assets[0]);
  }

  async function submit() {
    setError('');
    if (!file) return setError('Upload a photo of your driving licence.');
    if (!f.dailyRateKes || !f.county) return setError('Daily rate and county are required.');
    setStage('vetting'); setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    try {
      const [licenseFileUrl] = await uploadAssets([file]);
      const res = await api('/api/drivers/apply', { method: 'POST', body: { ...f, licenseFileUrl } });
      clearInterval(timerRef.current);
      setResult(res);
      if (res.vetStatus === 'VERIFIED') {
        setStage('verified');
        try { const me = await api('/api/auth/me'); await updateStoredUser(me); } catch { /* ignore */ }
        onVerified?.();
      } else setStage('rejected');
    } catch (e) {
      clearInterval(timerRef.current);
      setError(e.message); setStage('form');
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.appWrap}>
        <TouchableOpacity onPress={onClose}><Text style={styles.appClose}>✕ Close</Text></TouchableOpacity>

        {stage === 'form' && (
          <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 30 }}>
            <Text style={styles.appTitle}>Become a Driver 🧑‍✈️</Text>
            <Text style={styles.meta}>
              Every driver is verified. Upload your driving licence — our AI reads it in seconds and the name on it
              becomes your official driver name.
            </Text>
            <TouchableOpacity style={styles.uploadBtn} onPress={pickLicence}>
              <Text style={styles.uploadText}>🪪 {file ? 'Licence selected — tap to change' : 'Upload driving licence photo'}</Text>
            </TouchableOpacity>
            {!live && (
              <TextInput style={styles.input} placeholder="Your full name (used in demo mode)"
                value={f.typedName} onChangeText={(v) => set('typedName', v)} />
            )}
            <TextInput style={styles.input} placeholder="Daily rate (KES)" keyboardType="numeric"
              value={f.dailyRateKes} onChangeText={(v) => set('dailyRateKes', v)} />
            <TextInput style={styles.input} placeholder="Years experience" keyboardType="numeric"
              value={f.yearsExperience} onChangeText={(v) => set('yearsExperience', v)} />
            <View style={styles.chips}>
              {COUNTIES.map((c) => (
                <TouchableOpacity key={c} onPress={() => set('county', c)}
                  style={[styles.chip, f.county === c && styles.chipOn]}>
                  <Text style={[styles.chipText, f.county === c && { color: '#fff' }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={() => set('hasPsvBadge', !f.hasPsvBadge)}>
              <Text style={styles.meta}>{f.hasPsvBadge ? '☑' : '☐'} I have a PSV badge</Text>
            </TouchableOpacity>
            <TextInput style={[styles.input, { height: 60 }]} multiline placeholder="About you — routes, languages…"
              value={f.about} onChangeText={(v) => set('about', v)} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity style={styles.submitBtn} onPress={submit}>
              <Text style={styles.submitText}>Submit for AI Verification</Text>
            </TouchableOpacity>
            {!live && <Text style={styles.demo}>⚙️ Demo mode — vetting simulated. Add ANTHROPIC_API_KEY in .env for real reading.</Text>}
          </ScrollView>
        )}

        {stage === 'vetting' && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.green} />
            <Text style={styles.appTitle}>Verifying your licence…</Text>
            <Text style={styles.meta}>AI is reading your document. Under 31 seconds.</Text>
            <Text style={styles.bigSec}>{seconds}s</Text>
          </View>
        )}

        {stage === 'verified' && (
          <View style={styles.center}>
            <View style={styles.check}><Text style={styles.checkMark}>✓</Text></View>
            <Text style={styles.appTitle}>Verified in {((result?.tookMs || 0) / 1000).toFixed(1)}s 🎉</Text>
            <Text style={styles.meta}>
              Your driver name is {result.licenseName}{result.licenseClasses ? `, class ${result.licenseClasses}` : ''}.
              You're now listed in Drivers for Hire.
            </Text>
            <TouchableOpacity style={styles.submitBtn} onPress={onClose}><Text style={styles.submitText}>Done</Text></TouchableOpacity>
          </View>
        )}

        {stage === 'rejected' && (
          <View style={styles.center}>
            <View style={[styles.check, { backgroundColor: colors.red }]}><Text style={styles.checkMark}>✕</Text></View>
            <Text style={styles.appTitle}>Couldn't verify</Text>
            <Text style={styles.meta}>{result?.notes}</Text>
            <TouchableOpacity style={styles.submitBtn} onPress={() => setStage('form')}><Text style={styles.submitText}>Try again</Text></TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

// Edit my own driver details (rate, county, availability) — no re-vetting needed.
function EditDriverModal({ profile, visible, onClose, onSaved }) {
  const [f, setF] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));

  useEffect(() => {
    if (visible && profile) {
      setF({
        dailyRateKes: String(profile.dailyRateKes || ''),
        county: profile.county || 'Nairobi',
        yearsExperience: String(profile.yearsExperience || ''),
        licenseClasses: profile.licenseClasses || '',
        about: profile.about || '',
        hasPsvBadge: !!profile.hasPsvBadge,
        available: profile.available !== false,
      });
      setError('');
    }
  }, [visible, profile?.id]);

  async function submit() {
    setError(''); setBusy(true);
    try {
      await api('/api/drivers/me', { method: 'PUT', body: f });
      onSaved?.(); onClose();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  if (!profile) return null;
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScrollView style={styles.appWrap} contentContainerStyle={{ gap: 10, paddingBottom: 40 }}>
        <TouchableOpacity onPress={onClose}><Text style={styles.appClose}>✕ Close</Text></TouchableOpacity>
        <Text style={styles.appTitle}>My Driver Profile</Text>
        <Text style={styles.meta}>Listed as {profile.displayName} 🪪 licence verified.</Text>

        <Text style={styles.meta}>Daily rate (KES)</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={f.dailyRateKes}
          onChangeText={(v) => set('dailyRateKes', v)} />
        <TextInput style={styles.input} keyboardType="numeric" placeholder="Years experience"
          value={f.yearsExperience} onChangeText={(v) => set('yearsExperience', v)} />
        <TextInput style={styles.input} placeholder="Licence classes e.g. B,C1"
          value={f.licenseClasses} onChangeText={(v) => set('licenseClasses', v)} />
        <View style={styles.chips}>
          {COUNTIES.map((c) => (
            <TouchableOpacity key={c} onPress={() => set('county', c)}
              style={[styles.chip, f.county === c && styles.chipOn]}>
              <Text style={[styles.chipText, f.county === c && { color: '#fff' }]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput style={[styles.input, { height: 60 }]} multiline placeholder="About you"
          value={f.about} onChangeText={(v) => set('about', v)} />
        <TouchableOpacity onPress={() => set('hasPsvBadge', !f.hasPsvBadge)}>
          <Text style={styles.meta}>{f.hasPsvBadge ? '☑' : '☐'} I have a PSV badge</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => set('available', !f.available)}>
          <Text style={styles.meta}>{f.available ? '☑' : '☐'} Available for hire (uncheck to hide from the list)</Text>
        </TouchableOpacity>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={busy}>
          <Text style={styles.submitText}>{busy ? 'Saving…' : 'Save changes'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
}

// Star display / input
function Stars({ value = 0, size = 16, onPick }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Text key={n} onPress={onPick ? () => onPick(n) : undefined}
          style={{ fontSize: size, color: n <= Math.round(value) ? '#f5b301' : '#d4d4d4' }}>★</Text>
      ))}
    </View>
  );
}

function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function ReviewsModal({ driver, visible, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [me, setMe] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    try {
      const d = await api(`/api/drivers/${driver.id}/reviews`);
      setData(d);
      if (d.mine) { setRating(d.mine.rating); setComment(d.mine.comment || ''); }
    } catch (e) { setError(e.message); }
  }
  useEffect(() => {
    if (visible && driver) { setError(''); setRating(0); setComment(''); load(); getUser().then(setMe); }
  }, [visible, driver?.id]);

  async function submit() {
    setError('');
    if (!rating) return setError('Pick a star rating first.');
    setBusy(true);
    try {
      await api(`/api/drivers/${driver.id}/reviews`, { method: 'POST', body: { rating, comment } });
      await load(); onChanged?.();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  if (!driver) return null;
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.appWrap}>
        <TouchableOpacity onPress={onClose}><Text style={styles.appClose}>✕ Close</Text></TouchableOpacity>
        <Text style={styles.appTitle}>{driver.displayName}</Text>
        <View style={{ alignItems: 'center', marginBottom: 8 }}>
          {data?.count ? (
            <View style={{ alignItems: 'center' }}>
              <Stars value={data.average} size={20} />
              <Text style={styles.meta}>{data.average} · {data.count} review{data.count === 1 ? '' : 's'}</Text>
            </View>
          ) : <Text style={styles.meta}>No reviews yet — be the first.</Text>}
        </View>

        {me ? (
          <View style={styles.reviewForm}>
            <Text style={styles.meta}>{data?.mine ? 'Update your review' : 'Rate your experience'}</Text>
            <Stars value={rating} size={34} onPick={setRating} />
            <TextInput style={[styles.input, { height: 64 }]} multiline
              placeholder="How was the trip? Punctual, careful, knows the routes…"
              value={comment} onChangeText={setComment} maxLength={600} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={busy}>
              <Text style={styles.submitText}>{busy ? 'Saving…' : data?.mine ? 'Update review' : 'Post review'}</Text>
            </TouchableOpacity>
          </View>
        ) : <Text style={styles.meta}>Login (More tab) to leave a rating.</Text>}

        <FlatList
          style={{ marginTop: 12 }}
          data={data?.reviews || []}
          keyExtractor={(r) => String(r.id)}
          renderItem={({ item }) => (
            <View style={styles.reviewItem}>
              <View style={styles.row}>
                <Avatar src={item.author?.avatarUrl} name={item.author?.name} size={26} />
                <Text style={styles.reviewAuthor}>{item.author?.name}</Text>
                <Text style={styles.meta}>{timeAgo(item.createdAt)}</Text>
              </View>
              <Stars value={item.rating} />
              {item.comment ? <Text style={styles.about}>{item.comment}</Text> : null}
            </View>
          )}
        />
      </View>
    </Modal>
  );
}

export default function DriversScreen() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [myProfile, setMyProfile] = useState(null);
  const [reviewing, setReviewing] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try { setDrivers(await api('/api/drivers')); setError(''); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function loadMine() {
    const me = await getUser();
    if (!me) return;
    try { setMyProfile(await api('/api/drivers/me')); } catch { /* not a driver */ }
  }

  useEffect(() => { load(); loadMine(); }, []);

  async function openApply() {
    const me = await getUser();
    if (!me) return Alert.alert('Login required', 'Login (More tab) to apply as a driver.');
    setApplyOpen(true);
  }

  return (
    <View style={styles.container}>
      <DriverApplication visible={applyOpen} onClose={() => setApplyOpen(false)}
        onVerified={() => { load(); loadMine(); }} />
      <EditDriverModal profile={myProfile} visible={editOpen} onClose={() => setEditOpen(false)}
        onSaved={() => { load(); loadMine(); }} />
      <ReviewsModal driver={reviewing} visible={!!reviewing} onClose={() => setReviewing(null)} onChanged={load} />
      {myProfile?.vetStatus === 'VERIFIED' ? (
        <TouchableOpacity style={styles.becomeBtn} onPress={() => setEditOpen(true)}>
          <Text style={styles.becomeText}>⚙️ My Driver Profile — edit rate & details</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.becomeBtn} onPress={openApply}>
          <Text style={styles.becomeText}>🧑‍✈️ Become a Driver — get licence-verified</Text>
        </TouchableOpacity>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={drivers}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 12 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <Avatar src={item.user.avatarUrl} name={item.displayName} size={40} />
              <Text style={styles.name}>{item.displayName}</Text>
              <Text style={styles.licBadge}>🪪 Verified</Text>
            </View>
            <Text style={styles.rate}>{kes(item.dailyRateKes)} / day</Text>
            <View style={styles.row}>
              {item.reviewCount > 0 ? (
                <>
                  <Stars value={item.rating} />
                  <Text style={styles.meta}>{item.rating} ({item.reviewCount})</Text>
                </>
              ) : <Text style={styles.meta}>No ratings yet</Text>}
            </View>
            <Text style={styles.meta}>
              {item.yearsExperience} yrs · {item.county}
              {item.licenseClasses ? ` · Class ${item.licenseClasses}` : ''}{item.hasPsvBadge ? ' · PSV ✔' : ''}
            </Text>
            {item.about ? <Text style={styles.about}>{item.about}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {item.user.phone ? (
                <TouchableOpacity style={[styles.btn, { flex: 1 }]} onPress={() => Linking.openURL(`tel:${item.user.phone}`)}>
                  <Text style={styles.btnText}>📞 Call</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={[styles.btn, styles.reviewBtn, { flex: 1 }]} onPress={() => setReviewing(item)}>
                <Text style={[styles.btnText, { color: colors.greenDark }]}>
                  ⭐ Reviews{item.reviewCount ? ` (${item.reviewCount})` : ''}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={!loading && !error ? <Text style={styles.empty}>No verified drivers yet.</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  becomeBtn: { backgroundColor: colors.green, margin: 12, marginBottom: 0, borderRadius: 10, padding: 13, alignItems: 'center' },
  becomeText: { color: '#fff', fontWeight: '800' },
  card: {
    backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border, gap: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 16, fontWeight: '800', color: colors.ink, flex: 1 },
  licBadge: { fontSize: 10, fontWeight: '800', color: '#1e40af', backgroundColor: '#dbeafe', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  rate: { color: colors.greenDark, fontWeight: '800' },
  meta: { color: colors.muted, fontSize: 12 },
  about: { color: colors.ink, fontSize: 13, lineHeight: 18 },
  btn: { backgroundColor: colors.green, borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '700' },
  error: { color: colors.red, padding: 12 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40 },
  // application modal
  appWrap: { flex: 1, backgroundColor: colors.bg, padding: 18, paddingTop: 40 },
  appClose: { color: colors.greenDark, fontWeight: '700', marginBottom: 10 },
  appTitle: { fontSize: 20, fontWeight: '800', color: colors.ink, textAlign: 'center', marginTop: 8 },
  uploadBtn: { borderWidth: 2, borderStyle: 'dashed', borderColor: colors.green, borderRadius: 10, padding: 16, alignItems: 'center', backgroundColor: colors.card },
  uploadText: { color: colors.greenDark, fontWeight: '700' },
  input: { backgroundColor: colors.card, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.border, fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { fontSize: 12, color: colors.ink },
  submitBtn: { backgroundColor: colors.green, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 6 },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  demo: { fontSize: 11, color: '#92600b', backgroundColor: '#fff7e6', borderRadius: 8, padding: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, padding: 20 },
  bigSec: { fontSize: 40, fontWeight: '800', color: colors.greenDark },
  check: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: '#fff', fontSize: 34, fontWeight: '800' },
  // reviews
  reviewBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.green },
  reviewForm: { gap: 8, borderTopWidth: 1, borderColor: colors.border, paddingTop: 12 },
  reviewItem: { paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.border, gap: 3 },
  reviewAuthor: { fontWeight: '700', fontSize: 13, color: colors.ink, flex: 1 },
});
