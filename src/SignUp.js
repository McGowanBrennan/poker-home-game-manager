import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';

function SignUp() {
  const [signupType, setSignupType] = useState('email'); // 'email' or 'username'
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (signupType === 'email' && !email) {
      setError('Email is required');
      return;
    }

    if (signupType === 'username' && !username) {
      setError('Username is required');
      return;
    }

    if (!password || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    // Email validation (if using email)
    if (signupType === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('Please enter a valid email address');
        return;
      }
    }

    // Username validation (if using username)
    if (signupType === 'username') {
      if (username.length < 3 || username.length > 20) {
        setError('Username must be between 3 and 20 characters');
        return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        setError('Username can only contain letters, numbers, and underscores');
        return;
      }
    }

    // Password validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const requestBody = {
        password,
        ...(signupType === 'email' ? { email } : { username })
      };

      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok) {
        // Registration successful - store in localStorage for persistence
        localStorage.setItem('userEmail', data.user.identifier);
        localStorage.setItem('userCode', data.user.userCode);
        navigate('/dashboard', { state: { userEmail: data.user.identifier, userCode: data.user.userCode } });
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Error during registration:', error);
      setError('Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <Link to="/" className="auth-logo-link">
        <img src="/logo.png" alt="Logo" className="auth-page-logo" />
      </Link>
      <div className="auth-container">
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Join PokerHomeGameManager.com</p>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>Sign up with:</label>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <button
                type="button"
                onClick={() => setSignupType('email')}
                className={`toggle-btn ${signupType === 'email' ? 'active' : ''}`}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: signupType === 'email' ? '#4CAF50' : '#f0f0f0',
                  color: signupType === 'email' ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: signupType === 'email' ? 'bold' : 'normal'
                }}
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => setSignupType('username')}
                className={`toggle-btn ${signupType === 'username' ? 'active' : ''}`}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: signupType === 'username' ? '#4CAF50' : '#f0f0f0',
                  color: signupType === 'username' ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: signupType === 'username' ? 'bold' : 'normal'
                }}
              >
                Username
              </button>
            </div>
          </div>

          {signupType === 'email' ? (
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={loading}
              />
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="3-20 characters (letters, numbers, _)"
                disabled={loading}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              disabled={loading}
            />
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account? <Link to="/login">Log In</Link>
          </p>
          <Link to="/" className="back-link">← Back to Home</Link>
        </div>
      </div>
    </div>
  );
}

export default SignUp;

