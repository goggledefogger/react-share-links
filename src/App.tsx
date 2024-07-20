import React from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from 'react-router-dom';
import ChannelList from './components/ChannelList';
import ChannelView from './components/ChannelView';
import Auth from './components/Auth';
import { useAuthUser } from './hooks/useAuthUser';
import { ToastProvider } from './contexts/ToastContext';
import Toast from './components/Toast';
import './styles/variables.css';
import './styles/animations.css';
import './App.css';

const App: React.FC = () => {
  const { user, profile, signOutUser } = useAuthUser();

  return (
    <ToastProvider>
      <Router>
        <div className="App">
          <header className="App-header">
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
                  path="/login"
                  element={user ? <Navigate to="/" replace /> : <Auth />}
                />
              </Routes>
            </div>
          </main>
          <Toast />
        </div>
      </Router>
    </ToastProvider>
  );
};

export default App;
