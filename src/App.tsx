// src/App.tsx
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

const App: React.FC = () => {
  const { user, profile, loading, error } = useAuthUser(); // Use the hook

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <Router>
      <div className="App">
        <h1>Share Links</h1>
        <div className="user">
          {user ? `Welcome, ${profile?.username || user.email}` : 'Guest'}
        </div>
        <Routes>
          <Route
            path="/"
            element={user ? <ChannelList /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/channel/:id"
            element={user ? <ChannelView /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/login"
            element={user ? <Navigate to="/" replace /> : <Auth />}
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
