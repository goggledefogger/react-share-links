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

const App: React.FC = () => {
  const { user, profile, loading, error } = useAuthUser();

  console.log('App render:', { user, profile, loading, error });

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <ToastProvider>
      <Router>
        <div className="App">
          <h1>Share Links</h1>
          <div className="user">
            {user ? `Welcome, ${profile?.username || user.email}` : 'Guest'}
          </div>
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
          <Toast />
        </div>
      </Router>
    </ToastProvider>
  );
};

export default App;
