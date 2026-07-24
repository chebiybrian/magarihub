// Paid verification on mobile: pick a plan, pay via M-Pesa or card,
// badge is granted automatically once payment confirms.
import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Linking,
} from 'react-native';
import { api, getUser, updateStoredUser } from '../api/client';
import { colors } from '../theme';

export default function GetVerifiedScreen({ navigation }) {
  const [plans, setPlans] = useState([]);
  const [meta, setMeta] = useState({});
  const [purpose, setPurpose] = useState('VERIFICATION_INDIVIDUAL');
  const [phone, setPhone] = useState('');
  const [stage, setStage] = useState('choose'); // choose | waiting | done
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const pollRef = useRef(null);

  useEffect(() => {
    getUser().then((u) => u?.phone && setPhone(u.phone));
    api('/api/payments/plans').then((d) => { setPlans(d.plans); setMeta(d); }).catch((e) => setError(e.message));
    return () => clearInterval(pollRef.current);
  }, []);

  const plan = plans.find((p) => p.id === purpose);

  function poll(paymentId) {
    pollRef.current = setInterval(async () => {
      try {
        const s = await api(`/api/payments/${paymentId}/status`);
        if (s.status === 'COMPLETED') {
          clearInterval(pollRef.current);
          const me = await api('/api/auth/me');
          await updateStoredUser(me);
          setStage('done');
        } else if (s.status === 'FAILED') {
          clearInterval(pollRef.current);
          setError('Payment cancelled or failed. Try again.');
          setStage('choose');
        }
      } catch { /* keep polling */ }
    }, 2500);
  }

  async function payMpesa() {
    setError('');
    if (!phone) return setError('Enter your M-Pesa number');
    try {
      const r = await api('/api/payments/verification/mpesa', { method: 'POST', body: { purpose, phone } });
      setNote(r.message); setStage('waiting'); poll(r.paymentId);
    } catch (e) { setError(e.message); }
  }

  async function payCard() {
    setError('');
    try {
      const r = await api('/api/payments/verification/card', { method: 'POST', body: { purpose } });
      setNote(r.message || 'Opening secure checkout…'); setStage('waiting');
      if (r.checkoutUrl) { Linking.openURL(r.checkoutUrl); }
      poll(r.paymentId);
    } catch (e) { setError(e.message); }
  }

  if (stage === 'done') {
    return (
      <View style={styles.doneWrap}>
        <View style={styles.check}><Text style={styles.checkMark}>✓</Text></View>
        <Text style={styles.doneTitle}>You're verified! 🎉</Text>
        <Text style={styles.p}>
          Your {plan?.badge === 'DEALER_VERIFIED' ? 'Verified Dealer' : 'ID Verified'} badge is active for one year
          and shows on all your listings, reels and profile.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
          <Text style={styles.btnText}>Back to profile</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.intro}>
        Verified accounts earn buyer trust, rank higher in search, and show a badge everywhere. Choose your plan:
      </Text>

      {plans.map((p) => (
        <TouchableOpacity key={p.id} onPress={() => setPurpose(p.id)}
          style={[styles.planCard, purpose === p.id && styles.planOn]}>
          <View style={styles.planRow}>
            <Text style={styles.planTitle}>{p.id === 'VERIFICATION_BUSINESS' ? '🏢 Business' : '🧍 Individual'}</Text>
            <Text style={styles.planPrice}>KES {p.amountKes.toLocaleString()}<Text style={styles.perYear}>/yr</Text></Text>
          </View>
          <Text style={styles.meta}>
            {p.id === 'VERIFICATION_BUSINESS' ? 'Verified Dealer badge — for dealers, garages & companies'
              : 'ID Verified badge — for private sellers & drivers'}
          </Text>
        </TouchableOpacity>
      ))}

      {stage === 'waiting' ? (
        <View style={styles.card}>
          <ActivityIndicator color={colors.green} size="large" />
          <Text style={[styles.p, { textAlign: 'center', marginTop: 10 }]}>{note}</Text>
          <Text style={[styles.meta, { textAlign: 'center' }]}>Waiting for confirmation… updates automatically.</Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.payTitle}>Pay KES {plan?.amountKes.toLocaleString()}</Text>
          <Text style={styles.label}>M-Pesa number</Text>
          <TextInput style={styles.input} placeholder="07XX XXX XXX" keyboardType="phone-pad"
            value={phone} onChangeText={setPhone} />
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#17a34a' }]} onPress={payMpesa}>
            <Text style={styles.btnText}>📲 Pay with M-Pesa</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.cardBtn]} onPress={payCard}>
            <Text style={[styles.btnText, { color: colors.greenDark }]}>💳 Pay with Card</Text>
          </TouchableOpacity>
          {!meta.mpesaLive && (
            <Text style={styles.demo}>⚙️ Demo mode — no real charge. Payment is simulated so you can see the
              badge appear. Add Safaricom/Flutterwave keys in .env to take real money.</Text>
          )}
          {meta.paybill ? <Text style={styles.meta}>Paybill: {meta.paybill}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  intro: { fontSize: 13, color: colors.muted, marginBottom: 12, lineHeight: 18 },
  planCard: {
    backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12,
    padding: 14, marginBottom: 10,
  },
  planOn: { borderColor: colors.green },
  planRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  planPrice: { fontSize: 20, fontWeight: '800', color: colors.greenDark },
  perYear: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border, marginTop: 8, gap: 4 },
  payTitle: { fontSize: 16, fontWeight: '800', color: colors.ink, marginBottom: 6 },
  label: { fontSize: 12, color: colors.muted, marginTop: 6 },
  input: { backgroundColor: colors.bg, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.border, fontSize: 16 },
  btn: { backgroundColor: colors.green, borderRadius: 10, padding: 13, alignItems: 'center', marginTop: 10 },
  cardBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.green },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  demo: { fontSize: 11, color: '#92600b', backgroundColor: '#fff7e6', borderRadius: 8, padding: 8, marginTop: 10 },
  meta: { fontSize: 12, color: colors.muted },
  p: { fontSize: 13, color: colors.ink, lineHeight: 19 },
  error: { color: colors.red, marginTop: 6 },
  doneWrap: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 30, gap: 12 },
  check: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: '#fff', fontSize: 34, fontWeight: '800' },
  doneTitle: { fontSize: 22, fontWeight: '800', color: colors.ink },
});
