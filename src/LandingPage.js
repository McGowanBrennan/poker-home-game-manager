import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

function LandingPage() {
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate('/login');
  };

  const handleSignUp = () => {
    navigate('/signup');
  };

  return (
    <div className="landing-page">
      <div className="landing-content">
        <h1 className="site-title">PokerHomeGameManager.com</h1>
        <p className="site-subtitle">Manage your home poker games with ease</p>
        
        <div className="landing-buttons">
          <button className="landing-btn login-btn" onClick={handleLogin}>
            Log In
          </button>
          <button className="landing-btn signup-btn" onClick={handleSignUp}>
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;

