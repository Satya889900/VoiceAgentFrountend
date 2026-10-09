import React, { useState } from 'react';
import { Mic, Eye, EyeOff, Lock, User, AlertCircle, Sparkles, Zap, ShieldCheck } from 'lucide-react';

// Static hardcoded user credentials
const STATIC_USER = {
  username: 'admin',
  password: 'voiceagent@123',
  displayName: 'Satya Prakash',
  email: 'satyaprakash121122@gmail.com',
  role: 'ADMIN',
  avatar: 'SP',
};

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  const handleAutoFill = () => {
    setUsername(STATIC_USER.username);
    setPassword(STATIC_USER.password);
    setError('');
    setAutoFilled(true);
    setTimeout(() => setAutoFilled(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate realistic async login verification
    await new Promise((r) => setTimeout(r, 650));

    if (
      username.trim().toLowerCase() === STATIC_USER.username &&
      password === STATIC_USER.password
    ) {
      onLogin(STATIC_USER);
    } else {
      setError('Invalid username or password. Please use the demo credentials below.');
    }

    setLoading(false);
  };

  return (
    <div className="login-shell">
      {/* Ambient Radial Glowing Orbs */}
      <div className="login-bg-orb orb-a" />
      <div className="login-bg-orb orb-b" />
      <div className="login-bg-orb orb-c" />

      <div className="login-card">
        {/* Studio Brand Header */}
        <div className="login-brand">
          <div className="login-brand-icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
              <rect x="2" y="8" width="2.5" height="8" rx="1.25" />
              <rect x="6.5" y="4" width="2.5" height="16" rx="1.25" />
              <rect x="11" y="2" width="2.5" height="20" rx="1.25" />
              <rect x="15.5" y="4" width="2.5" height="16" rx="1.25" />
              <rect x="20" y="8" width="2.5" height="8" rx="1.25" />
            </svg>
          </div>
          <div>
            <h1 className="login-brand-title">Gemini Voice Agent</h1>
            <p className="login-brand-sub">MULTIMODAL AI STUDIO</p>
          </div>
        </div>

        <div className="login-header-group">
          <h2 className="login-heading">Welcome Back</h2>
          <p className="login-subheading">
            Sign in to start natural voice conversations & monitor live usage
          </p>
        </div>

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
                placeholder="admin"
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
                placeholder="••••••••••••"
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
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Quick Fill Button & Demo Credentials */}
          <div className="login-credentials-panel">
            <button
              type="button"
              className={`btn-auto-fill ${autoFilled ? 'filled' : ''}`}
              onClick={handleAutoFill}
            >
              <Zap size={14} className="zap-icon" />
              <span>{autoFilled ? 'Credentials Loaded!' : 'Auto-fill Demo Credentials'}</span>
            </button>
            <div className="login-hint-text">
              <code>admin</code> / <code>voiceagent@123</code>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`login-btn ${loading ? 'loading' : ''}`}
          >
            {loading ? (
              <>
                <span className="spinner" />
                <span>Authenticating Studio...</span>
              </>
            ) : (
              <>
                <Mic size={18} />
                <span>Enter Multimodal Studio</span>
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <div className="login-security-tag">
            <ShieldCheck size={14} className="text-emerald" />
            <span>Secure Static Authentication</span>
          </div>
          <p className="footer-credits">
            Powered by <strong>Google Gemini 2.0 Flash</strong> Multimodal AI
          </p>
        </div>
      </div>
    </div>
  );
}
