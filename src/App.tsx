import React from 'react';
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
import { FaUser, FaMoon, FaSun } from 'react-icons/fa';
import './styles/variables.css';
import './styles/animations.css';
import './App.css';

const AppContent: React.FC = () => {
  const { user, profile, signOutUser, loading } = useAuthUser();
  const { theme, toggleTheme } = useTheme();

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
          <nav className="main-nav">
            {user && (
              <>
                <Link to="/" className="nav-link">
                  Channels
                </Link>
                <Link to="/profile" className="nav-link">
                  Profile
                </Link>
              </>
            )}
          </nav>
          <div className="user-actions">
            {user ? (
              <>
                <span className="welcome-message">
                  Welcome, {profile?.username || user.email}
                </span>
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
