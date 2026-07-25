// Main app shell: top navigation + routes for every page.
import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { getUser, clearSession } from './api/client';
import Avatar from './components/Avatar';
import ContributeModal from './components/ContributeModal';
import ListingsPage from './pages/ListingsPage';
import ListingDetailPage from './pages/ListingDetailPage';
import ReelsPage from './pages/ReelsPage';
import DriversPage from './pages/DriversPage';
import InsurancePage from './pages/InsurancePage';
import GuidesPage from './pages/GuidesPage';
import PartsPage from './pages/PartsPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import PostPage from './pages/PostPage';
import EditListingPage from './pages/EditListingPage';
import UserProfilePage from './pages/UserProfilePage';
import GetVerifiedPage from './pages/GetVerifiedPage';
import PriceCheckPage from './pages/PriceCheckPage';

export default function App() {
  const user = getUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [supportOpen, setSupportOpen] = useState(false);

  // On the Reels page (phones), the top nav auto-hides as you swipe into a video
  // and reappears when you swipe back up — so it never covers the video or controls.
  const onReels = location.pathname.startsWith('/reels');
  const [navHidden, setNavHidden] = useState(false);
  useEffect(() => {
    if (!onReels) { setNavHidden(false); return; }
    let lastY = 0;
    const onScroll = (e) => {
      const el = e.target;
      if (!(el instanceof HTMLElement) || !el.classList.contains('reels-feed')) return;
      const y = el.scrollTop;
      if (y < 40) setNavHidden(false);            // near the top: always show
      else if (y > lastY + 6) setNavHidden(true);  // swiping down: hide
      else if (y < lastY - 6) setNavHidden(false); // swiping up: show
      lastY = y;
    };
    document.addEventListener('scroll', onScroll, true); // capture scroll from the feed
    return () => document.removeEventListener('scroll', onScroll, true);
  }, [onReels]);

  function logout() {
    clearSession();
    navigate('/');
    window.location.reload();
  }

  return (
    <div>
      <header className={`nav${onReels ? ' nav-reels' : ''}${navHidden ? ' nav-hidden' : ''}`}>
        <NavLink to="/" className="brand">Magari<span>Hub</span></NavLink>
        <nav>
          <NavLink to="/">Listings</NavLink>
          <NavLink to="/reels">Reels</NavLink>
          <NavLink to="/drivers">Drivers</NavLink>
          <NavLink to="/insurance">Insurance</NavLink>
          <NavLink to="/guides">Guides</NavLink>
          <NavLink to="/parts">Parts</NavLink>
          <NavLink to="/price-check">Price Check</NavLink>
        </nav>
        <div className="nav-right">
          <button className="btn small support-btn" onClick={() => setSupportOpen(true)}>❤️ Support</button>
          <NavLink to="/post" className="btn small post-btn">+ Post</NavLink>
          {user ? (
            <>
              <NavLink to="/profile" className="nav-user">
                <Avatar src={user.avatarUrl} name={user.name} size={30} />
                {user.name}
              </NavLink>
              <button className="btn small" onClick={logout}>Logout</button>
            </>
          ) : (
            <NavLink to="/login" className="btn small">Login</NavLink>
          )}
        </div>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<ListingsPage />} />
          <Route path="/listings/:id" element={<ListingDetailPage />} />
          <Route path="/listings/:id/edit" element={<EditListingPage />} />
          <Route path="/reels" element={<ReelsPage />} />
          <Route path="/drivers" element={<DriversPage />} />
          <Route path="/insurance" element={<InsurancePage />} />
          <Route path="/guides" element={<GuidesPage />} />
          <Route path="/parts" element={<PartsPage />} />
          <Route path="/post" element={<PostPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/users/:id" element={<UserProfilePage />} />
          <Route path="/search" element={<ListingsPage />} />
          <Route path="/get-verified" element={<GetVerifiedPage />} />
          <Route path="/price-check" element={<PriceCheckPage />} />
        </Routes>
      </main>

      {supportOpen && <ContributeModal onClose={() => setSupportOpen(false)} />}
    </div>
  );
}
