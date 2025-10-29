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
      <div className="poker-suits-bg">
        <span className="suit-icon">♠</span>
        <span className="suit-icon">♥</span>
        <span className="suit-icon">♣</span>
        <span className="suit-icon">♦</span>
      </div>
      
      <div className="landing-content">
        <div className="hero-card">
          <img src="/logo.png" alt="Poker Home Game Manager Logo" className="landing-logo" />
          <h1 className="site-title">
            <span className="title-main">Poker Home Game</span>
            <span className="title-sub">Manager</span>
          </h1>
          <p className="site-subtitle">Your all-in-one solution for organizing unforgettable poker nights</p>
          
          <div className="landing-buttons">
            <button className="landing-btn signup-btn" onClick={handleSignUp}>
              <span className="btn-text">Get Started</span>
              <span className="btn-icon">→</span>
            </button>
            <button className="landing-btn login-btn" onClick={handleLogin}>
              Log In
            </button>
          </div>

          <div className="feature-pills">
            <div className="pill">🎮 Easy Setup</div>
            <div className="pill">👥 Player Management</div>
            <div className="pill">🔗 Share Links</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;

