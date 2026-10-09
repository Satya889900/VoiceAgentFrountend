import React, { useState } from 'react';
import { Mic, Eye, EyeOff, Lock, User, Radio, AlertCircle } from 'lucide-react';

// Static hardcoded user credentials
const STATIC_USER = {
  username: 'admin',
  password: 'voiceagent@123',
  displayName: 'Satya Prakash',
  email: 'satyaprakash121122@gmail.com',
  role: 'Admin',
  avatar: 'SP',
};

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate a brief async login delay
    await new Promise((r) => setTimeout(r, 800));

    if (
      username.trim().toLowerCase() === STATIC_USER.username &&
      password === STATIC_USER.password
    ) {
      onLogin(STATIC_USER);
    } else {
      setError('Invalid username or password. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className="login-shell">
      {/* Background Orb Decorations */}
      <div className="login-bg-orb orb-a" />
      <div className="login-bg-orb orb-b" />

      <div className="login-card">
        {/* Logo / Brand */}
        <div className="login-brand">
          <div className="login-brand-icon">
            <Radio size={28} />
          </div>
          <div>
            <h1 className="login-brand-title">Gemini Voice Agent</h1>
            <p className="login-brand-sub">AI-Powered Conversational Studio</p>
          </div>
        </div>

        <div className="login-divider" />

        <h2 className="login-heading">Welcome back 👋</h2>
        <p className="login-subheading">Sign in to access your dashboard</p>

        {error && (
          <div className="login-error-banner">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          {/* Username */}
          <div className="login-field">
            <label htmlFor="username">Username</label>
            <div className="input-wrapper">
              <User size={18} className="input-icon" />
              <input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
                required
                autoFocus
                className="login-input"
              />
            </div>
          </div>

          {/* Password */}
          <div className="login-field">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                required
                className="login-input"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Demo Credentials Hint */}
          <div className="login-hint">
            <span>Demo credentials:</span>
            <code>admin</code> / <code>voiceagent@123</code>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className={`login-btn ${loading ? 'loading' : ''}`}
          >
            {loading ? (
              <>
                <span className="spinner" />
                Signing In...
              </>
            ) : (
              <>
                <Mic size={18} />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>Powered by <strong>Google Gemini</strong> & React</p>
        </div>
      </div>
    </div>
  );
}
