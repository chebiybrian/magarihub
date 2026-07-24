// TikTok-style reels for mobile — full feature set:
// double-tap to like (heart pop), comments sheet, save, native share,
// search, mute toggle, auto-scroll to next video, caption more/less, delete own reels.
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, Image, FlatList, Dimensions, TouchableOpacity, TouchableWithoutFeedback,
  StyleSheet, TextInput, Modal, KeyboardAvoidingView, Platform, Share, Alert,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useIsFocused } from '@react-navigation/native';
import { api, kes, mediaUrl, getUser, API_URL, uploadAssets } from '../api/client';
import { colors } from '../theme';
import VerifiedBadge from '../components/VerifiedBadge';
import Avatar from '../components/Avatar';
import ContributeModal from '../components/ContributeModal';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const REEL_HEIGHT = SCREEN_HEIGHT - 270; // minus header, feed tabs, search bar and tab bar

function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// Long captions collapse with a "more"/"less" toggle
function Caption({ text }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;
  const LIMIT = 80;
  if (text.length <= LIMIT) return <Text style={styles.caption}>{text}</Text>;
  return (
    <Text style={styles.caption} onPress={() => setExpanded(!expanded)}>
      {expanded ? text : `${text.slice(0, LIMIT).trimEnd()}… `}
      <Text style={styles.moreLess}>{expanded ? ' less' : 'more'}</Text>
    </Text>
  );
}

// A single comment or reply with a heart-like and (for top-level) a Reply action.
function CommentRow({ c, isReply, parentId, onLike, onReply, onOpenProfile }) {
  return (
    <View style={[styles.comment, isReply && styles.commentReply]}>
      <View style={{ flex: 1 }}>
        <View style={styles.authorRow}>
          <TouchableOpacity style={styles.authorTap} onPress={() => onOpenProfile(c.author?.id)}>
            <Avatar src={c.author?.avatarUrl} name={c.author?.name} size={isReply ? 20 : 22} />
            <Text style={styles.commentAuthor}>@{c.author?.name}</Text>
          </TouchableOpacity>
          <VerifiedBadge verification={c.author?.verification} />
          <Text style={styles.commentTime}>{timeAgo(c.createdAt)}</Text>
        </View>
        {c.text ? <Text style={styles.commentText}>{c.text}</Text> : null}
        {c.imageUrl ? <Image source={{ uri: mediaUrl(c.imageUrl) }} style={styles.commentImage} /> : null}
        {!isReply && onReply && (
          <TouchableOpacity onPress={() => onReply(c)}><Text style={styles.replyBtn}>Reply</Text></TouchableOpacity>
        )}
      </View>
      <TouchableOpacity style={styles.commentLike} onPress={() => onLike(c.id, isReply, parentId)}>
        <Ionicons name={c.likedByMe ? 'heart' : 'heart-outline'} size={16} color={c.likedByMe ? '#fe2c55' : '#888'} />
        {c.likes > 0 ? <Text style={styles.commentLikeCount}>{c.likes}</Text> : null}
      </TouchableOpacity>
    </View>
  );
}

function ReelItem({ reel, isActive, screenFocused, autoScroll, muted, me, onOpenListing, onOpenProfile, onEnded, onDeleted, showToast }) {
  // Only play when this reel is on screen AND the Reels tab is the active screen,
  // so audio stops the moment you navigate to a listing, profile or another tab.
  const shouldPlay = isActive && screenFocused;
  const [likes, setLikes] = useState(reel.likes);
  const [liked, setLiked] = useState(reel.likedByMe);
  const [saved, setSaved] = useState(reel.savedByMe);
  const [commentsCount, setCommentsCount] = useState(reel.commentsCount || 0);
  const [showHeart, setShowHeart] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState(null);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [attach, setAttach] = useState(null); // picked image asset
  const [sending, setSending] = useState(false);
  const [followingAuthor, setFollowingAuthor] = useState(reel.followedByMe);
  const [giftOpen, setGiftOpen] = useState(false);
  const lastTap = useRef(0);
  const viewCounted = useRef(false);
  const loggedIn = !!me;
  const isMine = me && reel.author?.id === me.id;

  async function toggleFollow() {
    if (!loggedIn) return showToast('Login (More tab) to follow accounts');
    const was = followingAuthor;
    setFollowingAuthor(!was);
    try {
      const r = await api(`/api/users/${reel.author.id}/follow`, { method: 'POST' });
      setFollowingAuthor(r.following);
      showToast(r.following ? `Following @${reel.author.name} ✔` : `Unfollowed @${reel.author.name}`);
    } catch (e) {
      setFollowingAuthor(was);
      showToast(e.message);
    }
  }

  useEffect(() => {
    if (shouldPlay && !viewCounted.current) {
      viewCounted.current = true;
      api(`/api/reels/${reel.id}/view`, { method: 'POST' }).catch(() => {});
    }
  }, [shouldPlay]);

  async function like(ensure = false) {
    if (!loggedIn) return showToast('Login (More tab) to like reels');
    const was = liked;
    if (ensure && was) return; // double-tap never un-likes
    setLiked(true);
    if (!was) setLikes((n) => n + 1);
    if (!ensure && was) { setLiked(false); setLikes((n) => n - 1); }
    try {
      const r = await api(`/api/reels/${reel.id}/like`, { method: 'POST', body: { ensure } });
      setLiked(r.liked); setLikes(r.likes);
    } catch (e) { setLiked(was); showToast(e.message); }
  }

  // Double-tap = like with heart pop. Single tap does nothing (video keeps playing).
  function handleTap() {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      lastTap.current = 0;
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 700);
      like(true);
    } else {
      lastTap.current = now;
    }
  }

  async function openComments() {
    setCommentsOpen(true);
    if (comments === null) {
      try { setComments(await api(`/api/reels/${reel.id}/comments`)); } catch { setComments([]); }
    }
  }

  async function pickCommentImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8,
    });
    if (!result.canceled) setAttach(result.assets[0]);
  }

  async function postComment() {
    if (!loggedIn) return showToast('Login (More tab) to comment');
    if (!text.trim() && !attach) return;
    setSending(true);
    try {
      let imageUrl = null;
      if (attach) { const [url] = await uploadAssets([attach]); imageUrl = url; }
      const c = await api(`/api/reels/${reel.id}/comments`, {
        method: 'POST', body: { text, imageUrl, parentId: replyTo?.id || null },
      });
      if (replyTo) {
        setComments((list) => (list || []).map((tc) => tc.id === replyTo.id
          ? { ...tc, replies: [...(tc.replies || []), c] } : tc));
      } else {
        setComments((list) => [c, ...(list || [])]);
      }
      setCommentsCount((n) => n + 1);
      setText(''); setReplyTo(null); setAttach(null);
    } catch (e) { showToast(e.message); }
    finally { setSending(false); }
  }

  async function likeComment(commentId, isReply, parentId) {
    try {
      const r = await api(`/api/reels/comments/${commentId}/like`, { method: 'POST' });
      setComments((list) => (list || []).map((tc) => {
        if (!isReply && tc.id === commentId) return { ...tc, likedByMe: r.liked, likes: r.likes };
        if (isReply && tc.id === parentId) {
          return { ...tc, replies: tc.replies.map((rp) => rp.id === commentId ? { ...rp, likedByMe: r.liked, likes: r.likes } : rp) };
        }
        return tc;
      }));
    } catch (e) { showToast(e.message); }
  }

  async function toggleSave() {
    if (!loggedIn) return showToast('Login (More tab) to save videos');
    const was = saved;
    setSaved(!was);
    try {
      const r = await api(`/api/reels/${reel.id}/save`, { method: 'POST' });
      setSaved(r.saved);
      showToast(r.saved ? 'Saved to your profile ✔' : 'Removed from saved');
    } catch (e) { setSaved(was); showToast(e.message); }
  }

  async function shareReel() {
    try {
      await Share.share({
        message: `${reel.caption || 'Check out this car reel on MagariHub'}\n${API_URL.replace(':4000', ':5173')}/reels#reel-${reel.id}`,
      });
    } catch { /* user closed the share sheet */ }
  }

  function deleteReel() {
    Alert.alert('Delete reel', 'Delete this reel permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await api(`/api/reels/${reel.id}`, { method: 'DELETE' }); onDeleted(); }
          catch (e) { showToast(e.message); }
        },
      },
    ]);
  }

  return (
    <View style={styles.reel}>
      <TouchableWithoutFeedback onPress={handleTap}>
        <Video
          source={{ uri: mediaUrl(reel.videoUrl) }}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          shouldPlay={shouldPlay}
          isLooping={!autoScroll}    /* auto-scroll: don't loop, jump to next */
          isMuted={muted}
          onPlaybackStatusUpdate={(s) => { if (s.didJustFinish && autoScroll) onEnded(); }}
        />
      </TouchableWithoutFeedback>

      {showHeart && (
        <Ionicons name="heart" size={96} color="#fe2c55" style={styles.bigHeart} />
      )}

      <View style={styles.overlay}>
        <View style={styles.authorRow}>
          <TouchableOpacity style={styles.authorTap} onPress={() => onOpenProfile(reel.author?.id)}>
            <Avatar src={reel.author?.avatarUrl} name={reel.author?.name} size={30} />
            <Text style={styles.author}>@{reel.author?.name}</Text>
          </TouchableOpacity>
          <VerifiedBadge verification={reel.author?.verification} />
          {loggedIn && !isMine && (
            <TouchableOpacity
              style={[styles.followBtn, followingAuthor && styles.followBtnOn]}
              onPress={toggleFollow}>
              <Text style={styles.followBtnText}>{followingAuthor ? '✓ Following' : '+ Follow'}</Text>
            </TouchableOpacity>
          )}
        </View>
        <Caption text={reel.caption} />
        {reel.listing ? (
          <TouchableOpacity style={styles.listingBtn} onPress={() => onOpenListing(reel.listing.id)}>
            <Text style={styles.listingBtnText}>View car · {kes(reel.listing.priceKes)}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.railBtn} onPress={() => like(false)}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={32}
            color={liked ? '#fe2c55' : '#fff'} style={styles.railIcon} />
          <Text style={styles.railText}>{likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.railBtn} onPress={openComments}>
          <Ionicons name="chatbubble-ellipses-outline" size={30} color="#fff" style={styles.railIcon} />
          <Text style={styles.railText}>{commentsCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.railBtn} onPress={toggleSave}>
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={29}
            color={saved ? '#facc15' : '#fff'} style={styles.railIcon} />
          <Text style={styles.railText}>{saved ? 'Saved' : 'Save'}</Text>
        </TouchableOpacity>
        {!isMine && (
          <TouchableOpacity style={styles.railBtn} onPress={() => setGiftOpen(true)}>
            <Ionicons name="gift-outline" size={29} color="#fff" style={styles.railIcon} />
            <Text style={styles.railText}>Gift</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.railBtn} onPress={shareReel}>
          <Ionicons name="arrow-redo-outline" size={30} color="#fff" style={styles.railIcon} />
          <Text style={styles.railText}>Share</Text>
        </TouchableOpacity>
        {isMine && (
          <TouchableOpacity style={styles.railBtn} onPress={deleteReel}>
            <Ionicons name="trash-outline" size={28} color="#fff" style={styles.railIcon} />
            <Text style={styles.railText}>Delete</Text>
          </TouchableOpacity>
        )}
        <View style={styles.railBtn}>
          <Ionicons name="eye-outline" size={28} color="#fff" style={styles.railIcon} />
          <Text style={styles.railText}>{reel.views}</Text>
        </View>
      </View>

      <ContributeModal visible={giftOpen} recipient={{ id: reel.author?.id, name: reel.author?.name }} onClose={() => setGiftOpen(false)} />

      {/* Comments bottom sheet */}
      <Modal visible={commentsOpen} animationType="slide" transparent onRequestClose={() => setCommentsOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalWrap}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setCommentsOpen(false)} />
          <View style={styles.commentsSheet}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Comments {comments ? `(${comments.length})` : ''}</Text>
              <TouchableOpacity onPress={() => setCommentsOpen(false)}><Text style={styles.close}>✕</Text></TouchableOpacity>
            </View>
            <FlatList
              data={comments || []}
              keyExtractor={(c) => String(c.id)}
              style={{ flex: 1 }}
              ListEmptyComponent={
                <Text style={styles.emptyComments}>
                  {comments === null ? 'Loading…' : 'No comments yet — be the first!'}
                </Text>
              }
              renderItem={({ item }) => (
                <View>
                  <CommentRow c={item} onLike={likeComment} onReply={setReplyTo}
                    onOpenProfile={(id) => { setCommentsOpen(false); onOpenProfile(id); }} />
                  {item.replies?.map((r) => (
                    <CommentRow key={r.id} c={r} isReply parentId={item.id} onLike={likeComment}
                      onOpenProfile={(id) => { setCommentsOpen(false); onOpenProfile(id); }} />
                  ))}
                </View>
              )}
            />
            <View style={styles.commentInputWrap}>
              {replyTo && (
                <View style={styles.replyingTo}>
                  <Text style={styles.replyingText}>Replying to @{replyTo.author?.name}</Text>
                  <TouchableOpacity onPress={() => setReplyTo(null)}><Text style={styles.close}>✕</Text></TouchableOpacity>
                </View>
              )}
              {attach && (
                <View style={styles.attachRow}>
                  <Image source={{ uri: attach.uri }} style={styles.attachThumb} />
                  <TouchableOpacity onPress={() => setAttach(null)}><Text style={styles.replyingText}>✕ remove</Text></TouchableOpacity>
                </View>
              )}
              <View style={styles.commentInputRow}>
              <TouchableOpacity onPress={pickCommentImage} disabled={!loggedIn} style={styles.attachBtn}>
                <Ionicons name="image-outline" size={24} color={loggedIn ? colors.green : colors.muted} />
              </TouchableOpacity>
              <TextInput
                style={styles.commentInput}
                placeholder={loggedIn ? (replyTo ? 'Write a reply…' : 'Add a comment…') : 'Login (More tab) to comment'}
                value={text}
                onChangeText={setText}
                editable={loggedIn}
                maxLength={500}
              />
              <TouchableOpacity style={[styles.postBtn, (!loggedIn || sending) && { opacity: 0.5 }]} onPress={postComment} disabled={!loggedIn || sending}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{sending ? '…' : 'Post'}</Text>
              </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

export default function ReelsScreen({ navigation }) {
  const [reels, setReels] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [q, setQ] = useState('');
  const [muted, setMuted] = useState(false); // opening the tab is a tap, so sound can start ON
  const [autoScroll, setAutoScroll] = useState(false);
  const [feedType, setFeedType] = useState('foryou'); // 'foryou' | 'latest'
  const isFocused = useIsFocused(); // false as soon as you leave the Reels tab
  const [me, setMe] = useState(null);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const listRef = useRef(null);
  const toastTimer = useRef(null);

  useEffect(() => { getUser().then(setMe); }, []);

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2200);
  }

  async function load(query = '', feed = feedType) {
    try {
      setError('');
      const params = new URLSearchParams({ feed });
      if (query) params.set('q', query);
      const rs = await api(`/api/reels?${params}`);
      setReels(rs);
      if (query) showToast(`${rs.length} video${rs.length === 1 ? '' : 's'} found`);
    } catch (e) { setError(e.message); }
  }

  function switchFeed(feed) {
    if (feed === feedType) return;
    setFeedType(feed);
    load(q, feed);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }

  useEffect(() => { load(); }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index ?? 0);
  }).current;

  const openListing = useCallback(
    (id) => navigation.navigate('Cars', { screen: 'ListingDetail', params: { id } }),
    [navigation]
  );
  const openProfile = useCallback(
    (id) => id && navigation.navigate('Cars', { screen: 'UserProfile', params: { id } }),
    [navigation]
  );

  const scrollNext = (i) => {
    if (i + 1 < reels.length) listRef.current?.scrollToIndex({ index: i + 1, animated: true });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={styles.feedTabs}>
        {[['following', 'Following'], ['foryou', 'For You'], ['latest', 'Latest']].map(([key, label]) => (
          <TouchableOpacity key={key} onPress={() => switchFeed(key)}
            style={[styles.feedTab, feedType === key && styles.feedTabOn]}>
            <Text style={[styles.feedTabText, feedType === key && { color: '#fff' }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.topBar}>
        <TextInput
          style={styles.search}
          placeholder="🔍 Search videos… e.g. Prado"
          placeholderTextColor="#999"
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => load(q)}
          returnKeyType="search"
        />
        {q ? (
          <TouchableOpacity onPress={() => { setQ(''); load(); }}>
            <Text style={styles.topBtn}>✕</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity onPress={() => setMuted(!muted)}>
          <Text style={styles.topBtn}>{muted ? '🔇' : '🔊'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setAutoScroll(!autoScroll); showToast(!autoScroll ? '⏭ Auto-scroll ON' : 'Auto-scroll OFF — videos loop'); }}>
          <Text style={[styles.topBtn, autoScroll && { color: '#4ade80' }]}>⏭</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        ref={listRef}
        data={reels}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item, index }) => (
          <ReelItem
            reel={item}
            isActive={index === activeIndex}
            screenFocused={isFocused}
            autoScroll={autoScroll}
            muted={muted}
            me={me}
            onOpenListing={openListing}
            onOpenProfile={openProfile}
            onEnded={() => scrollNext(index)}
            onDeleted={() => setReels((rs) => rs.filter((x) => x.id !== item.id))}
            showToast={showToast}
          />
        )}
        snapToInterval={REEL_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        getItemLayout={(data, index) => ({ length: REEL_HEIGHT, offset: REEL_HEIGHT * index, index })}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        ListEmptyComponent={!error ? (
          <Text style={styles.empty}>
            {feedType === 'following'
              ? 'Videos from accounts you follow will appear here.\nFind creators in For You and tap + Follow!'
              : 'No videos found.'}
          </Text>
        ) : null}
      />

      {toast ? <View style={styles.toast}><Text style={{ color: '#fff', fontSize: 12 }}>{toast}</Text></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  feedTabs: {
    flexDirection: 'row', justifyContent: 'center', gap: 8,
    paddingTop: 8, paddingBottom: 2, backgroundColor: '#000',
  },
  feedTab: { paddingHorizontal: 18, paddingVertical: 6, borderRadius: 999, backgroundColor: '#1c1c1c' },
  feedTabOn: { backgroundColor: colors.green },
  feedTabText: { color: '#aaa', fontWeight: '800', fontSize: 12 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#000',
  },
  search: {
    flex: 1, backgroundColor: '#1c1c1c', color: '#fff', borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 8, fontSize: 13,
  },
  topBtn: { color: '#fff', fontSize: 20 },
  reel: { height: REEL_HEIGHT, backgroundColor: '#000', justifyContent: 'center' },
  video: { width: '100%', height: '100%' },
  bigHeart: {
    position: 'absolute', alignSelf: 'center', top: '38%',
    textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 14,
  },
  overlay: { position: 'absolute', bottom: 16, left: 14, right: 76 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  authorTap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  author: { color: '#fff', fontWeight: '800', fontSize: 15 },
  caption: { color: '#fff', marginTop: 4, fontSize: 13, lineHeight: 18 },
  moreLess: { color: '#c9c9c9', fontWeight: '800' },
  listingBtn: {
    backgroundColor: colors.green, alignSelf: 'flex-start', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, marginTop: 8,
  },
  followBtn: {
    backgroundColor: colors.green, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4, marginLeft: 4,
  },
  followBtnOn: { backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  followBtnText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  listingBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  actions: { position: 'absolute', right: 12, bottom: 40, alignItems: 'center', gap: 15 },
  actionText: { color: '#fff', textAlign: 'center', fontSize: 14, lineHeight: 19 },
  railBtn: { alignItems: 'center', gap: 2 },
  railIcon: { textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 6 },
  railText: {
    color: '#fff', fontSize: 11, fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4,
  },
  error: { color: '#f87171', padding: 12 },
  empty: { color: '#999', textAlign: 'center', marginTop: 60 },
  toast: {
    position: 'absolute', bottom: 24, alignSelf: 'center',
    backgroundColor: 'rgba(30,30,30,0.95)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999,
  },
  // comments sheet
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  commentsSheet: {
    height: '62%', backgroundColor: colors.card,
    borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: 'hidden',
  },
  sheetHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, borderBottomWidth: 1, borderColor: colors.border,
  },
  sheetTitle: { fontWeight: '800', fontSize: 15, color: colors.ink },
  close: { fontSize: 18, color: colors.muted, padding: 4 },
  comment: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 14, paddingVertical: 8 },
  commentReply: { paddingLeft: 40 },
  commentAuthor: { fontWeight: '700', fontSize: 12, color: colors.ink },
  commentTime: { fontSize: 10, color: colors.muted },
  commentText: { fontSize: 14, color: colors.ink, marginTop: 2, lineHeight: 19 },
  replyBtn: { fontSize: 11, fontWeight: '700', color: colors.muted, marginTop: 3 },
  commentImage: { width: 150, height: 150, borderRadius: 10, marginTop: 4, backgroundColor: colors.bg },
  attachRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingTop: 8 },
  attachThumb: { width: 48, height: 48, borderRadius: 8 },
  attachBtn: { justifyContent: 'center', paddingHorizontal: 4 },
  commentLike: { alignItems: 'center', paddingTop: 2, minWidth: 24 },
  commentLikeCount: { fontSize: 10, color: colors.muted },
  emptyComments: { textAlign: 'center', color: colors.muted, marginTop: 30 },
  commentInputWrap: { borderTopWidth: 1, borderColor: colors.border },
  replyingTo: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 12, paddingTop: 8,
  },
  replyingText: { fontSize: 12, color: colors.muted },
  commentInputRow: { flexDirection: 'row', gap: 8, padding: 10 },
  commentInput: {
    flex: 1, backgroundColor: colors.bg, borderRadius: 999, paddingHorizontal: 14,
    paddingVertical: 9, fontSize: 13, borderWidth: 1, borderColor: colors.border,
  },
  postBtn: {
    backgroundColor: colors.green, borderRadius: 999, paddingHorizontal: 16,
    justifyContent: 'center',
  },
});
