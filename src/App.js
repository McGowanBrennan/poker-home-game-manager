import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './LandingPage';
import SignUp from './SignUp';
import Login from './Login';
import GameManagement from './GameManagement';
import PokerTable from './PokerTable';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<GameManagement />} />
        <Route path="/table/:gameId" element={<PokerTable />} />
      </Routes>
    </Router>
  );
}

export default App;

