// src/App.tsx
import React, { useRef } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
  Navigate,
} from 'react-router-dom';
import { CSSTransition, SwitchTransition } from 'react-transition-group';
import ChannelList from './components/ChannelList';
import ChannelView from './components/ChannelView';
import Auth from './components/Auth';
import { useAuthUser } from './hooks/useAuthUser';
import { ToastProvider } from './contexts/ToastContext';
import Toast from './components/Toast';
import './App.css';
import './styles/animations.css';

const AnimatedRoutes = () => {
  const location = useLocation();
  const { user, profile, loading, error, signOutUser } = useAuthUser();
  const nodeRef = useRef(null);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <SwitchTransition>
      <CSSTransition
        key={location.pathname}
        classNames="fade"
        timeout={300}
        nodeRef={nodeRef}>
        <div ref={nodeRef}>
          <Routes location={location}>
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
              path="/login"
              element={user ? <Navigate to="/" replace /> : <Auth />}
            />
          </Routes>
        </div>
      </CSSTransition>
    </SwitchTransition>
  );
};

const App: React.FC = () => {
  const { user, profile, signOutUser } = useAuthUser();

  return (
    <ToastProvider>
      <Router>
        <div className="App">
          <header className="header">
            <h1>Share Links</h1>
            <div className="user-info">
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
                <span className="welcome-message">Guest</span>
              )}
            </div>
          </header>
          <main>
            <AnimatedRoutes />
          </main>
          <Toast />
        </div>
      </Router>
    </ToastProvider>
  );
};

export default App;
