// My profile: photo, badge status, verification, my listings, saved videos, logout.
import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api, getToken, clearSession, uploadAssets, updateStoredUser } from '../api/client';
import { colors } from '../theme';
import VerifiedBadge from '../components/VerifiedBadge';
import Avatar from '../components/Avatar';

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');
  const [myListings, setMyListings] = useState([]);
  const [savedReels, setSavedReels] = useState([]);

  useEffect(() => {
    (async () => {
      if (!(await getToken())) { navigation.replace('Login'); return; }
      try { setUser(await api('/api/auth/me')); }
      catch { navigation.replace('Login'); return; }
      api('/api/listings/mine/all').then(setMyListings).catch(() => {});
      api('/api/reels/saved/mine').then(setSavedReels).catch(() => {});
    })();
  }, []);

  async function changePhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    try {
      const [url] = await uploadAssets(result.assets);
      const updated = await api('/api/users/me', { method: 'PUT', body: { avatarUrl: url } });
      setUser(updated);
      await updateStoredUser(updated);
    } catch (e) { Alert.alert('Error', e.message); }
  }

  async function logout() {
    await clearSession();
    navigation.replace('Login');
  }

  if (!user) return <Text style={styles.loading}>Loading…</Text>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, gap: 8 }}>
      <View style={styles.profileHead}>
        <TouchableOpacity onPress={changePhoto}>
          <Avatar src={user.avatarUrl} name={user.name} size={80} />
        </TouchableOpacity>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.name}>{user.name}</Text>
          <VerifiedBadge verification={user.verification} />
          <Text style={styles.meta}>{user.email} · {user.role}{user.county ? ` · ${user.county}` : ''}</Text>
          <Text style={styles.followStats}>
            <Text style={styles.followNum}>{user.followersCount ?? 0}</Text> Followers ·{' '}
            <Text style={styles.followNum}>{user.followingCount ?? 0}</Text> Following
          </Text>
          <TouchableOpacity onPress={changePhoto}>
            <Text style={styles.changePhoto}>📷 {user.avatarUrl ? 'Change photo' : 'Add profile photo'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Verification Badge</Text>
        {user.verification !== 'ID_VERIFIED' && user.verification !== 'DEALER_VERIFIED' && (
          <>
            <Text style={styles.p}>
              Get an ID Verified badge (KES 300/yr) or Verified Dealer badge (KES 1,000/yr).
              Verified accounts earn more buyer trust and rank higher.
            </Text>
            {user.verification === 'PENDING' ? (
              <Text style={styles.meta}>⏳ You have a pending request — pay below to activate instantly.</Text>
            ) : null}
            <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('GetVerified')}>
              <Text style={styles.btnText}>Get Verified →</Text>
            </TouchableOpacity>
          </>
        )}
        {(user.verification === 'ID_VERIFIED' || user.verification === 'DEALER_VERIFIED') && (
          <>
            <Text style={styles.p}>✔ You are verified. Your badge shows on all your listings, reels and profile.</Text>
            {user.verificationExpiry ? (
              <Text style={styles.meta}>
                Valid until {new Date(user.verificationExpiry).toLocaleDateString('en-KE', { dateStyle: 'long' })}.
              </Text>
            ) : null}
          </>
        )}
        {message ? <Text style={styles.meta}>{message}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🚗 My Listings ({myListings.length})</Text>
        {myListings.length === 0 ? (
          <Text style={styles.p}>Cars you post will appear here.</Text>
        ) : (
          myListings.map((l) => (
            <TouchableOpacity key={l.id} style={styles.rowItem}
              onPress={() => navigation.navigate('Cars', { screen: 'ListingDetail', params: { id: l.id } })}>
              <Text style={styles.rowText} numberOfLines={1}>{l.title}</Text>
              <Text style={[styles.rowBadge, l.status === 'SOLD' && styles.soldBadge]}>{l.status}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔖 Saved Videos ({savedReels.length})</Text>
        {savedReels.length === 0 ? (
          <Text style={styles.p}>Videos you save on the Reels tab will appear here.</Text>
        ) : (
          savedReels.map((r) => (
            <TouchableOpacity key={r.id} style={styles.rowItem} onPress={() => navigation.navigate('Reels')}>
              <Text style={styles.rowText} numberOfLines={1}>🎬 {r.caption || 'Reel'} — @{r.author?.name}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      <TouchableOpacity style={[styles.btn, styles.logout]} onPress={logout}>
        <Text style={styles.btnText}>Logout</Text>
      </TouchableOpacity>
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  rowItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8,
    paddingVertical: 9, borderBottomWidth: 1, borderColor: colors.border,
  },
  rowText: { flex: 1, fontSize: 13, color: colors.ink },
  profileHead: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  followStats: { fontSize: 12, color: colors.muted, marginTop: 2 },
  followNum: { fontWeight: '800', color: colors.ink },
  changePhoto: { color: colors.greenDark, fontWeight: '700', fontSize: 12, marginTop: 2 },
  rowBadge: {
    fontSize: 10, fontWeight: '800', color: colors.greenDark,
    backgroundColor: '#d9f0e1', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999,
  },
  soldBadge: { color: colors.red, backgroundColor: '#fee2e2' },
  loading: { padding: 20, color: colors.muted },
  name: { fontSize: 22, fontWeight: '800', color: colors.ink },
  meta: { color: colors.muted, fontSize: 12 },
  card: {
    backgroundColor: colors.card, borderRadius: 12, padding: 16, marginTop: 14,
    borderWidth: 1, borderColor: colors.border, gap: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  p: { fontSize: 13, lineHeight: 19, color: colors.ink },
  btn: { backgroundColor: colors.green, borderRadius: 10, padding: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
  logout: { backgroundColor: colors.red, marginTop: 14 },
});
