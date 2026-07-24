// Reusable contribute popup for mobile — tip a creator (pass recipient)
// or support MagariHub (omit recipient). Pay any amount via M-Pesa or card.
import { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, ScrollView,
} from 'react-native';
import { api, getUser } from '../api/client';
import { colors } from '../theme';

const PRESETS = [50, 100, 200, 500, 1000];

export default function ContributeModal({ visible, recipient, onClose }) {
  const [amount, setAmount] = useState(100);
  const [custom, setCustom] = useState('');
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [stage, setStage] = useState('choose'); // choose | waiting | done
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const pollRef = useRef(null);

  useEffect(() => {
    if (visible) { getUser().then((u) => u?.phone && setPhone(u.phone)); setStage('choose'); setError(''); }
    return () => clearInterval(pollRef.current);
  }, [visible]);

  const finalAmount = custom ? Number(custom) : amount;
  const title = recipient ? `Gift @${recipient.name}` : 'Support MagariHub ❤️';

  function poll(id) {
    pollRef.current = setInterval(async () => {
      try {
        const s = await api(`/api/payments/${id}/status`);
        if (s.status === 'COMPLETED') { clearInterval(pollRef.current); setStage('done'); }
        else if (s.status === 'FAILED') { clearInterval(pollRef.current); setError('Payment failed or cancelled.'); setStage('choose'); }
      } catch { /* keep polling */ }
    }, 2500);
  }

  async function pay(method) {
    setError('');
    if (!finalAmount || finalAmount < 10) return setError('Enter at least KES 10.');
    if (method === 'MPESA' && !phone) return setError('Enter your M-Pesa number.');
    try {
      const r = await api('/api/payments/contribute', {
        method: 'POST',
        body: { amountKes: finalAmount, method, phone, message, recipientId: recipient?.id },
      });
      setNote(r.message); setStage('waiting');
      if (r.checkoutUrl) Linking.openURL(r.checkoutUrl);
      poll(r.paymentId);
    } catch (e) { setError(e.message); }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <TouchableOpacity style={styles.close} onPress={onClose}><Text style={styles.closeX}>✕</Text></TouchableOpacity>

          {stage === 'done' ? (
            <View style={styles.center}>
              <View style={styles.heart}><Text style={styles.heartMark}>♥</Text></View>
              <Text style={styles.doneTitle}>{recipient ? 'Gift sent! 🎉' : 'Thank you! 🎉'}</Text>
              <Text style={styles.meta}>
                {recipient ? `@${recipient.name} receives your KES ${finalAmount.toLocaleString()} tip.`
                  : `Your KES ${finalAmount.toLocaleString()} keeps MagariHub running. Asante!`}
              </Text>
              <TouchableOpacity style={styles.btn} onPress={onClose}><Text style={styles.btnText}>Done</Text></TouchableOpacity>
            </View>
          ) : stage === 'waiting' ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.green} size="large" />
              <Text style={[styles.meta, { marginTop: 10, textAlign: 'center' }]}>{note}</Text>
              <Text style={styles.meta}>Waiting for confirmation…</Text>
            </View>
          ) : (
            <ScrollView>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.meta}>
                {recipient ? 'Send a gift to show appreciation.' : 'Contribute any amount to help keep MagariHub free.'}
              </Text>
              <View style={styles.chips}>
                {PRESETS.map((v) => (
                  <TouchableOpacity key={v} onPress={() => { setAmount(v); setCustom(''); }}
                    style={[styles.chip, !custom && amount === v && styles.chipOn]}>
                    <Text style={[styles.chipText, !custom && amount === v && { color: '#fff' }]}>KES {v.toLocaleString()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput style={styles.input} placeholder="Custom amount (KES)" keyboardType="numeric"
                value={custom} onChangeText={setCustom} />
              <TextInput style={styles.input} placeholder="Add a message (optional)" value={message}
                onChangeText={setMessage} maxLength={200} />
              <TextInput style={styles.input} placeholder="M-Pesa number 07XX XXX XXX" keyboardType="phone-pad"
                value={phone} onChangeText={setPhone} />
              <TouchableOpacity style={[styles.btn, { backgroundColor: '#17a34a' }]} onPress={() => pay('MPESA')}>
                <Text style={styles.btnText}>📲 Give KES {(finalAmount || 0).toLocaleString()} via M-Pesa</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.cardBtn]} onPress={() => pay('CARD')}>
                <Text style={[styles.btnText, { color: colors.greenDark }]}>💳 Give via Card</Text>
              </TouchableOpacity>
              <Text style={styles.demo}>⚙️ Demo mode — no real charge until payment keys are added.</Text>
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20, maxHeight: '82%' },
  close: { position: 'absolute', top: 12, right: 16, zIndex: 2 },
  closeX: { fontSize: 20, color: colors.muted },
  title: { fontSize: 18, fontWeight: '800', color: colors.ink, marginBottom: 4 },
  meta: { fontSize: 12, color: colors.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
  chipOn: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { fontWeight: '700', fontSize: 12, color: colors.ink },
  input: { backgroundColor: colors.bg, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 10, fontSize: 15 },
  btn: { backgroundColor: colors.green, borderRadius: 10, padding: 13, alignItems: 'center', marginTop: 4 },
  cardBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.green, marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  demo: { fontSize: 11, color: '#92600b', backgroundColor: '#fff7e6', borderRadius: 8, padding: 8, marginTop: 10 },
  error: { color: colors.red, marginTop: 8 },
  center: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  heart: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#e11d48', alignItems: 'center', justifyContent: 'center' },
  heartMark: { color: '#fff', fontSize: 30 },
  doneTitle: { fontSize: 20, fontWeight: '800', color: colors.ink },
});
