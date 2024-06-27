// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import ChannelList from './components/ChannelList';
import ChannelView from './components/ChannelView';

const App: React.FC = () => {
  return (
    <Router>
      <div className="App">
        <h1>Share Links</h1>
        <Routes>
          <Route path="/" element={<ChannelList />} />
          <Route path="/channel/:id" element={<ChannelView />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
