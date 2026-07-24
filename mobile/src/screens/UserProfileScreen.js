// Public profile screen — opened by tapping someone's photo on reels or seller cards.
// Shows badge, follower counts, follow button, their cars and reels.
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { api, getUser, kes } from '../api/client';
import { colors } from '../theme';
import Avatar from '../components/Avatar';
import VerifiedBadge from '../components/VerifiedBadge';
import ListingCard from '../components/ListingCard';
import ContributeModal from '../components/ContributeModal';

export default function UserProfileScreen({ route, navigation }) {
  const { id } = route.params;
  const [profile, setProfile] = useState(null);
  const [me, setMe] = useState(null);
  const [error, setError] = useState('');
  const [giftOpen, setGiftOpen] = useState(false);

  useEffect(() => {
    api(`/api/users/${id}`).then(setProfile).catch((e) => setError(e.message));
    getUser().then(setMe);
  }, [id]);

  async function toggleFollow() {
    if (!me) return Alert.alert('Login required', 'Login (More tab) to follow accounts.');
    try {
      const r = await api(`/api/users/${id}/follow`, { method: 'POST' });
      setProfile({ ...profile, followedByMe: r.following, followersCount: r.followersCount });
    } catch (e) { Alert.alert('Error', e.message); }
  }

  if (error) return <Text style={styles.error}>{error}</Text>;
  if (!profile) return <Text style={styles.loading}>Loading…</Text>;

  const isMe = me && me.id === profile.id;
  const memberSince = new Date(profile.createdAt).toLocaleDateString('en-KE', { year: 'numeric', month: 'long' });
  const listings = (profile.listings || []).map((l) => ({
    ...l,
    seller: { id: profile.id, name: profile.name, verification: profile.verification },
  }));

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
      <View style={styles.head}>
        <Avatar src={profile.avatarUrl} name={profile.name} size={84} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={styles.name}>{profile.name}</Text>
          <VerifiedBadge verification={profile.verification} />
          <Text style={styles.meta}>
            {profile.role}{profile.county ? ` · ${profile.county}` : ''} · Since {memberSince}
          </Text>
          <Text style={styles.meta}>
            <Text style={styles.bold}>{profile.followersCount}</Text> Followers ·{' '}
            <Text style={styles.bold}>{profile.followingCount}</Text> Following
          </Text>
          {!isMe && me && (
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.followBtn, profile.followedByMe && styles.followBtnOn]} onPress={toggleFollow}>
                <Text style={[styles.followText, profile.followedByMe && { color: colors.greenDark }]}>
                  {profile.followedByMe ? '✓ Following' : '+ Follow'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.giftBtn} onPress={() => setGiftOpen(true)}>
                <Text style={styles.giftText}>🎁 Gift</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <ContributeModal visible={giftOpen} recipient={{ id: profile.id, name: profile.name }} onClose={() => setGiftOpen(false)} />
      {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

      <Text style={styles.section}>🚗 Cars for Sale ({listings.length})</Text>
      {listings.length === 0 ? (
        <Text style={styles.meta}>No cars listed right now.</Text>
      ) : (
        listings.map((l) => (
          <ListingCard key={l.id} listing={l} onPress={() => navigation.push('ListingDetail', { id: l.id })} />
        ))
      )}

      <Text style={styles.section}>🎬 Reels ({profile.reels?.length || 0})</Text>
      {(profile.reels || []).length === 0 ? (
        <Text style={styles.meta}>No reels posted yet.</Text>
      ) : (
        profile.reels.map((r) => (
          <TouchableOpacity key={r.id} style={styles.reelRow} onPress={() => navigation.navigate('Reels')}>
            <Text style={styles.reelText} numberOfLines={1}>🎬 {r.caption || 'Reel'}</Text>
            <Text style={styles.meta}>👁️ {r.views} · ❤️ {r.likes}</Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loading: { padding: 20, color: colors.muted },
  error: { padding: 20, color: colors.red },
  head: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  name: { fontSize: 20, fontWeight: '800', color: colors.ink },
  meta: { fontSize: 12, color: colors.muted },
  bold: { fontWeight: '800', color: colors.ink },
  bio: { marginTop: 10, fontSize: 13, lineHeight: 19, color: colors.ink },
  followBtn: {
    backgroundColor: colors.green, borderRadius: 999, alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 6, marginTop: 4,
  },
  followBtnOn: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.green },
  followText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  giftBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e11d48', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  giftText: { color: '#e11d48', fontWeight: '800', fontSize: 12 },
  section: { fontSize: 16, fontWeight: '800', color: colors.ink, marginTop: 18, marginBottom: 8 },
  reelRow: {
    backgroundColor: colors.card, borderRadius: 10, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: colors.border, gap: 2,
  },
  reelText: { fontSize: 13, fontWeight: '600', color: colors.ink },
});
