import React, { useState } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  Link,
} from 'react-router-dom';
import ChannelList from './components/ChannelList/ChannelList';
import ChannelView from './components/ChannelView/ChannelView';
import Auth from './components/Auth/Auth';
import UserProfile from './components/UserProfile/UserProfile';
import { useAuthUser } from './hooks/useAuthUser';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import Toast from './components/Toast/Toast';
import LoadingSpinner from './components/common/LoadingSpinner';
import { FaMoon, FaSun, FaBars } from 'react-icons/fa';
import './styles/variables.css';
import './styles/animations.css';
import './styles/mobile.css';
import './App.css';
import MobileMenu from './components/MobileMenu/MobileMenu';
import SharedLinkLanding from './components/SharedLinkLanding/SharedLinkLanding';

const AppContent: React.FC = () => {
  const { user, profile, signOutUser, loading } = useAuthUser();
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className={`App ${theme}`}>
      <header className="App-header">
        <div className="header-content">
          <Link to="/" className="logo-link">
            <img
              src="/images/share-links-logo.png"
              alt="Share Links Logo"
              className="logo"
            />
            <h1>Share Links</h1>
          </Link>
          <button
            className="hamburger-menu"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <FaBars />
          </button>
          <nav className="main-nav">
            {user && (
              <Link to="/" className="nav-link">
                Channels
              </Link>
            )}
          </nav>
          <div className="user-actions">
            {user ? (
              <>
                <Link to="/profile" className="welcome-message">
                  Welcome, {profile?.username || user.email}
                </Link>
                <button onClick={signOutUser} className="btn btn-primary">
                  Sign Out
                </button>
              </>
            ) : (
              <Link to="/login" className="btn btn-primary">
                Sign In
              </Link>
            )}
            <button
              onClick={toggleTheme}
              className="btn btn-icon"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}>
              {theme === 'light' ? <FaMoon /> : <FaSun />}
            </button>
          </div>
        </div>
      </header>
      <MobileMenu
        isOpen={isMobileMenuOpen}
        user={user}
        profile={profile}
        signOutUser={signOutUser}
        theme={theme}
        toggleTheme={toggleTheme}
        onClose={closeMobileMenu}
      />
      <main>
        <div className="container">
          <Routes>
            <Route
              path="/"
              element={
                user ? <ChannelList /> : <Navigate to="/login" replace />
              }
            />
            <Route
              path="/channel/:id"
              element={
                user ? <ChannelView /> : <Navigate to="/login" replace />
              }
            />
            <Route
              path="/profile"
              element={
                user ? <UserProfile /> : <Navigate to="/login" replace />
              }
            />
            <Route
              path="/login"
              element={user ? <Navigate to="/" replace /> : <Auth />}
            />
            <Route path="/sharedLink/:linkId" element={<SharedLinkLanding />} />
          </Routes>
        </div>
      </main>
      <Toast />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <Router>
          <AppContent />
        </Router>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
