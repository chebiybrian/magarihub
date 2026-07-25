// TikTok-style reels feed:
// - double-tap/double-click a video to like it (with the heart pop animation)
// - comments panel, save (bookmark), share button
// - auto-scroll: when a video ends, the feed moves to the next one (toggle top-right)
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, kes, mediaUrl, getToken, getUser, uploadFiles } from '../api/client';
import VerifiedBadge from '../components/VerifiedBadge';
import Avatar from '../components/Avatar';
import Icon from '../components/Icons';
import ContributeModal from '../components/ContributeModal';

function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// Long captions collapse to ~90 characters with a "more"/"less" toggle (TikTok-style)
function Caption({ text }) {
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 90;
  if (!text) return null;
  if (text.length <= LIMIT) return <p className="reel-caption">{text}</p>;
  return (
    <p className={`reel-caption ${expanded ? 'expanded' : ''}`}>
      {expanded ? text : `${text.slice(0, LIMIT).trimEnd()}… `}
      <button className="caption-toggle" onClick={() => setExpanded(!expanded)}>
        {expanded ? ' less' : 'more'}
      </button>
    </p>
  );
}

// A single comment (or reply): author, text, heart-like, and a Reply action.
function CommentRow({ c, isReply, onLike, onReply, loggedIn }) {
  const [liked, setLiked] = useState(c.likedByMe);
  const [likes, setLikes] = useState(c.likes || 0);

  async function like() {
    if (!loggedIn) return;
    const was = liked;
    setLiked(!was); setLikes((n) => n + (was ? -1 : 1));
    try { const r = await onLike(c.id); setLiked(r.liked); setLikes(r.likes); }
    catch { setLiked(was); setLikes((n) => n + (was ? 1 : -1)); }
  }

  return (
    <div className={`comment ${isReply ? 'comment-reply' : ''}`}>
      <div className="comment-main">
        <b>
          <Link to={`/users/${c.author?.id}`} className="author-link dark" title="View profile">
            <Avatar src={c.author?.avatarUrl} name={c.author?.name} size={isReply ? 20 : 22} />
            @{c.author?.name}
          </Link>
          {' '}<VerifiedBadge verification={c.author?.verification} />
        </b>
        {c.text && <p>{c.text}</p>}
        {c.imageUrl && <img className="comment-image" src={mediaUrl(c.imageUrl)} alt="attachment" />}
        <span className="comment-actions">
          {timeAgo(c.createdAt)}
          {!isReply && <button className="link" onClick={() => onReply(c)}>Reply</button>}
        </span>
      </div>
      <button className={`comment-like ${liked ? 'on' : ''}`} onClick={like} title="Like">
        <Icon name="heart" filled={liked} color={liked ? '#fe2c55' : '#8a8a8a'} size={16} />
        {likes > 0 && <span>{likes}</span>}
      </button>
    </div>
  );
}

function CommentsPanel({ comments, count, onClose, onPost, onLike, loggedIn }) {
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null); // the comment being replied to
  const [image, setImage] = useState(null); // { file, preview }
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  function pickImage(e) {
    const file = e.target.files[0];
    if (file) setImage({ file, preview: URL.createObjectURL(file) });
    e.target.value = '';
  }

  async function submit(e) {
    e.preventDefault();
    if (!text.trim() && !image) return;
    setUploading(true);
    try {
      let imageUrl = null;
      if (image) { const [url] = await uploadFiles([image.file]); imageUrl = url; }
      await onPost(text, replyTo?.id || null, imageUrl);
      setText(''); setReplyTo(null); setImage(null);
    } finally { setUploading(false); }
  }

  return (
    <div className="comments-panel" onClick={(e) => e.stopPropagation()}>
      <div className="comments-head">
        <b>Comments {count != null ? `(${count})` : ''}</b>
        <button className="link" onClick={onClose}>✕</button>
      </div>
      <div className="comments-list">
        {comments === null && <p className="meta">Loading…</p>}
        {comments?.length === 0 && <p className="meta">No comments yet — be the first!</p>}
        {comments?.map((c) => (
          <div key={c.id}>
            <CommentRow c={c} onLike={onLike} onReply={setReplyTo} loggedIn={loggedIn} />
            {c.replies?.map((r) => (
              <CommentRow key={r.id} c={r} isReply onLike={onLike} loggedIn={loggedIn} />
            ))}
          </div>
        ))}
      </div>
      <form className="comment-input" onSubmit={submit}>
        {replyTo && (
          <div className="replying-to">
            Replying to @{replyTo.author?.name}
            <button type="button" className="link" onClick={() => setReplyTo(null)}>✕</button>
          </div>
        )}
        {image && (
          <div className="comment-attach-preview">
            <img src={image.preview} alt="to send" />
            <button type="button" className="link" onClick={() => setImage(null)}>✕ remove</button>
          </div>
        )}
        <div className="comment-input-row">
          <button type="button" className="attach-btn" onClick={() => fileRef.current?.click()}
            disabled={!loggedIn} title="Add photo or GIF">🖼️</button>
          <input type="file" accept="image/*,image/gif" hidden ref={fileRef} onChange={pickImage} />
          <input
            placeholder={loggedIn ? (replyTo ? 'Write a reply…' : 'Add a comment…') : 'Login to comment'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!loggedIn}
            maxLength={500}
          />
          <button className="btn small" type="submit" disabled={!loggedIn || uploading}>
            {uploading ? '…' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  );
}

function ReelItem({ reel, domId, refCb, autoScroll, onVideoEnd, showToast, muted, volume, onDeleted }) {
  const videoRef = useRef(null);
  const clickTimer = useRef(null);
  const mutedRef = useRef(muted);
  const volumeRef = useRef(volume);
  const [likes, setLikes] = useState(reel.likes);
  const [liked, setLiked] = useState(reel.likedByMe);
  const [saved, setSaved] = useState(reel.savedByMe);
  const [hearts, setHearts] = useState([]); // floating heart animations
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState(null);
  const [commentsCount, setCommentsCount] = useState(reel.commentsCount || 0);
  const [text, setText] = useState('');
  const [followingAuthor, setFollowingAuthor] = useState(reel.followedByMe);
  const [giftOpen, setGiftOpen] = useState(false);
  const loggedIn = !!getToken();
  const me = getUser();
  const isMine = me && reel.author?.id === me.id;

  async function toggleFollow() {
    if (!loggedIn) return showToast('Login to follow accounts');
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

  async function deleteReel() {
    if (!window.confirm('Delete this reel permanently?')) return;
    try {
      await api(`/api/reels/${reel.id}`, { method: 'DELETE' });
      showToast('Reel deleted');
      onDeleted();
    } catch (e) { showToast(e.message); }
  }

  // Apply the global sound settings to this video (and react to changes)
  useEffect(() => {
    mutedRef.current = muted;
    volumeRef.current = volume;
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = muted;
    if (!muted && !video.paused) {
      // if the browser refuses sound, fall back to muted instead of freezing
      video.play().catch(() => { video.muted = true; });
    }
  }, [muted, volume]);

  // Autoplay when visible, pause when scrolled away
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.muted = mutedRef.current;
          video.volume = volumeRef.current;
          video.play().catch(() => {
            video.muted = true; // autoplay with sound blocked — play silent rather than not at all
            video.play().catch(() => {});
          });
          api(`/api/reels/${reel.id}/view`, { method: 'POST' }).catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [reel.id]);

  async function like(ensure = false) {
    if (!loggedIn) return showToast('Login to like reels');
    const wasLiked = liked;
    if (ensure && wasLiked) return; // double-tap never un-likes
    setLiked(true);
    if (!wasLiked) setLikes((n) => n + 1);
    if (!ensure && wasLiked) { setLiked(false); setLikes((n) => n - 1); }
    try {
      const res = await api(`/api/reels/${reel.id}/like`, { method: 'POST', body: { ensure } });
      setLiked(res.liked);
      setLikes(res.likes);
    } catch (e) {
      setLiked(wasLiked);
      showToast(e.message);
    }
  }

  // Single click = play/pause. Double click = like + heart pop (TikTok style).
  function handleVideoClick(e) {
    const video = e.currentTarget;
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      const rect = video.parentElement.getBoundingClientRect();
      const heart = { id: Date.now(), x: e.clientX - rect.left, y: e.clientY - rect.top };
      setHearts((h) => [...h, heart]);
      setTimeout(() => setHearts((h) => h.filter((p) => p.id !== heart.id)), 900);
      like(true);
    } else {
      clickTimer.current = setTimeout(() => {
        clickTimer.current = null;
        video.paused ? video.play() : video.pause();
      }, 250);
    }
  }

  async function openComments() {
    setCommentsOpen(true);
    if (comments === null) {
      try { setComments(await api(`/api/reels/${reel.id}/comments`)); }
      catch { setComments([]); }
    }
  }

  // Post a comment, or a reply when parentId is set; optional image/GIF
  async function postComment(commentText, parentId, imageUrl) {
    if (!loggedIn) return showToast('Login to comment');
    try {
      const c = await api(`/api/reels/${reel.id}/comments`, { method: 'POST', body: { text: commentText, parentId, imageUrl } });
      if (parentId) {
        // nest the reply under its top-level comment
        setComments((list) => (list || []).map((tc) => tc.id === parentId
          ? { ...tc, replies: [...(tc.replies || []), c] } : tc));
      } else {
        setComments((list) => [c, ...(list || [])]);
      }
      setCommentsCount((n) => n + 1);
    } catch (err) { showToast(err.message); }
  }

  // Toggle a heart on a comment (used by both comments and replies)
  async function likeComment(commentId) {
    return api(`/api/reels/comments/${commentId}/like`, { method: 'POST' });
  }

  async function toggleSave() {
    if (!loggedIn) return showToast('Login to save videos');
    const was = saved;
    setSaved(!was);
    try {
      const r = await api(`/api/reels/${reel.id}/save`, { method: 'POST' });
      setSaved(r.saved);
      showToast(r.saved ? 'Saved to your profile ✔' : 'Removed from saved');
    } catch (e) {
      setSaved(was);
      showToast(e.message);
    }
  }

  async function share() {
    const url = `${window.location.origin}/reels#reel-${reel.id}`;
    const shareText = reel.caption || 'Check out this car reel on MagariHub';
    if (navigator.share) {
      try { await navigator.share({ title: 'MagariHub Reels', text: shareText, url }); } catch { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        showToast('Link copied — paste it in WhatsApp!');
      } catch { showToast(url); }
    }
  }

  return (
    <div className="reel" id={domId} ref={refCb}>
      <video
        ref={videoRef}
        src={mediaUrl(reel.videoUrl)}
        loop={!autoScroll}       /* auto-scroll mode: don't loop, jump to next when done */
        playsInline
        onClick={handleVideoClick}
        onEnded={onVideoEnd}
      />

      {/* floating hearts from double-tap */}
      {hearts.map((h) => (
        <span key={h.id} className="heart-pop" style={{ left: h.x, top: h.y }}>
          <Icon name="heart" filled color="#fe2c55" size={86} />
        </span>
      ))}

      <div className="reel-overlay">
        <p className="reel-author">
          <Link to={`/users/${reel.author?.id}`} className="author-link" title="View profile">
            <Avatar src={reel.author?.avatarUrl} name={reel.author?.name} size={32} />
            @{reel.author?.name}
          </Link>
          {' '}<VerifiedBadge verification={reel.author?.verification} />
          {loggedIn && !isMine && (
            <button className={`follow-btn ${followingAuthor ? 'on' : ''}`} onClick={toggleFollow}>
              {followingAuthor ? '✓ Following' : '+ Follow'}
            </button>
          )}
        </p>
        <Caption text={reel.caption} />
        {reel.listing && (
          <Link to={`/listings/${reel.listing.id}`} className="btn small">
            View car · {kes(reel.listing.priceKes)}
          </Link>
        )}
      </div>

      <div className="reel-actions">
        <button className={`rail-btn ${liked ? 'pop' : ''}`} onClick={() => like(false)} title="Like">
          <Icon name="heart" filled={liked} color={liked ? '#fe2c55' : '#fff'} size={30} />
          <span>{likes}</span>
        </button>
        <button className="rail-btn" onClick={openComments} title="Comments">
          <Icon name="comment" size={28} />
          <span>{commentsCount}</span>
        </button>
        <button className={`rail-btn ${saved ? 'pop' : ''}`} onClick={toggleSave} title="Save">
          <Icon name="bookmark" filled={saved} color={saved ? '#facc15' : '#fff'} size={28} />
          <span>{saved ? 'Saved' : 'Save'}</span>
        </button>
        {!isMine && (
          <button className="rail-btn" onClick={() => setGiftOpen(true)} title="Gift the creator">
            <Icon name="gift" size={28} />
            <span>Gift</span>
          </button>
        )}
        <button className="rail-btn" onClick={share} title="Share">
          <Icon name="share" size={27} />
          <span>Share</span>
        </button>
        {isMine && (
          <button className="rail-btn" onClick={deleteReel} title="Delete my reel">
            <Icon name="trash" size={26} />
            <span>Delete</span>
          </button>
        )}
        <span className="rail-btn static" title="Views">
          <Icon name="eye" size={26} />
          <span>{reel.views}</span>
        </span>
      </div>

      {giftOpen && (
        <ContributeModal recipient={{ id: reel.author.id, name: reel.author.name }} onClose={() => setGiftOpen(false)} />
      )}

      {commentsOpen && (
        <CommentsPanel
          comments={comments}
          count={commentsCount}
          onClose={() => setCommentsOpen(false)}
          onPost={postComment}
          onLike={likeComment}
          loggedIn={loggedIn}
        />
      )}
    </div>
  );
}

export default function ReelsPage() {
  const [reels, setReels] = useState([]);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [autoScroll, setAutoScroll] = useState(() => localStorage.getItem('reelsAutoScroll') === 'on');
  const [q, setQ] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searched, setSearched] = useState(false); // are we showing search results?
  const [muted, setMuted] = useState(true); // videos start silent (browser autoplay rules)
  const [volume, setVolume] = useState(1);
  const [feedType, setFeedType] = useState('foryou'); // 'foryou' | 'latest'
  const containers = useRef([]);
  const feedRef = useRef(null);
  const toastTimer = useRef(null);

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
      return rs;
    } catch (e) {
      setError(e.message);
      return [];
    }
  }

  function switchFeed(feed) {
    if (feed === feedType) return;
    setFeedType(feed);
    load(q, feed);
    feedRef.current?.scrollTo({ top: 0 });
  }

  useEffect(() => {
    load().then(() => {
      // shared links look like /reels#reel-3 — scroll straight to that video
      setTimeout(() => {
        const hash = window.location.hash;
        if (hash.startsWith('#reel-')) document.getElementById(hash.slice(1))?.scrollIntoView();
      }, 300);
    });
  }, []);

  async function submitSearch(e) {
    e.preventDefault();
    if (!q.trim()) return;
    const rs = await load(q.trim());
    setSearched(true);
    showToast(`${rs.length} video${rs.length === 1 ? '' : 's'} found`);
  }

  function clearSearch() {
    setQ('');
    setSearchOpen(false);
    setSearched(false);
    load();
  }

  function toggleMute() {
    const on = muted; // currently muted -> turning sound ON
    setMuted(!muted);
    showToast(on ? '🔊 Sound on' : '🔇 Muted');
  }

  function toggleAutoScroll() {
    const on = !autoScroll;
    setAutoScroll(on);
    localStorage.setItem('reelsAutoScroll', on ? 'on' : 'off');
    showToast(on ? 'Auto-scroll ON — next video plays automatically' : 'Auto-scroll OFF — videos loop');
  }

  const scrollToNext = (i) => containers.current[i + 1]?.scrollIntoView({ behavior: 'smooth' });

  if (error) return <div className="page"><p className="error">{error}</p></div>;

  return (
    <div className="reels-feed" ref={feedRef}>
      <div className="reels-bar">
        <div className="feed-tabs">
          {[['following', 'Following'], ['foryou', 'For You'], ['latest', 'Latest']].map(([key, label]) => (
            <button key={key} className={`feed-tab ${feedType === key ? 'on' : ''}`} onClick={() => switchFeed(key)}>
              {label}
            </button>
          ))}
        </div>
        <div className="reels-topbar">
          {searchOpen ? (
            <form className="reels-search" onSubmit={submitSearch}>
              <input
                autoFocus
                placeholder="Search…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button className="btn small" type="submit">Go</button>
              <button className="btn small secondary" type="button" onClick={clearSearch} title="Clear search">✕</button>
            </form>
          ) : (
            <button className="btn small" onClick={() => setSearchOpen(true)} title="Search">🔍</button>
          )}
          <div className="volume-ctl">
            <button className="btn small" onClick={toggleMute} title={muted ? 'Turn sound on' : 'Mute'}>
              {muted ? '🔇' : '🔊'}
            </button>
            {!muted && (
              <input
                type="range" min="0" max="100"
                value={Math.round(volume * 100)}
                onChange={(e) => setVolume(Number(e.target.value) / 100)}
                title={`Volume ${Math.round(volume * 100)}%`}
              />
            )}
          </div>
          <button className={`btn small autoscroll-btn ${autoScroll ? 'on' : ''}`}
            onClick={toggleAutoScroll} title={`Auto-scroll ${autoScroll ? 'ON' : 'OFF'}`}>
            ⏭
          </button>
        </div>
      </div>
      {reels.map((r, i) => (
        <ReelItem
          key={r.id}
          reel={r}
          domId={`reel-${r.id}`}
          refCb={(el) => { containers.current[i] = el; }}
          autoScroll={autoScroll}
          onVideoEnd={() => autoScroll && scrollToNext(i)}
          showToast={showToast}
          muted={muted}
          volume={volume}
          onDeleted={() => setReels((rs) => rs.filter((x) => x.id !== r.id))}
        />
      ))}
      {reels.length === 0 && (
        <p className="page reels-empty">
          {searched
            ? `No videos match "${q}" — try another word or clear the search.`
            : feedType === 'following'
              ? 'Videos from accounts you follow will appear here. Find creators in For You and tap + Follow!'
              : 'No reels yet — be the first to post!'}
        </p>
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
