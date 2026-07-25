// Main app shell: top navigation + routes for every page.
import { useState } from 'react';
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

  // On phones the Reels page hides the top nav entirely for a full-screen video;
  // a small floating back button (below) lets you leave the reels.
  const onReels = location.pathname.startsWith('/reels');

  function logout() {
    clearSession();
    navigate('/');
    window.location.reload();
  }

  return (
    <div>
      <header className={`nav${onReels ? ' nav-reels' : ''}`}>
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

      {onReels && (
        <button
          className="reels-back"
          aria-label="Back"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}

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
