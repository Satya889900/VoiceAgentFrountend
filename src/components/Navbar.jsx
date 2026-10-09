import React from 'react';
import { Mic, BarChart2, Radio, CheckCircle, AlertCircle, LogOut, Laptop, Cloud } from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  activeSessionsCount,
  isConnected,
  user,
  onLogout,
  backendMode,
  onToggleBackendMode,
}) {
  return (
    <nav className="navbar">
      <div className="nav-brand">
        <div className="brand-icon">
          <Radio className="icon-pulse" size={22} />
        </div>
        <div>
          <span className="brand-title">Gemini Voice Agent</span>
          <span className="brand-tag">Multimodal AI Studio</span>
        </div>
      </div>

      <div className="nav-tabs">
        <button
          className={`tab-btn ${activeTab === 'agent' ? 'active' : ''}`}
          onClick={() => setActiveTab('agent')}
        >
          <Mic size={18} />
          <span>Voice Agent</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <BarChart2 size={18} />
          <span>Usage & Cost Dashboard</span>
          {activeSessionsCount > 0 && (
            <span className="tab-badge pulse">{activeSessionsCount} Live</span>
          )}
        </button>
      </div>

      <div className="nav-right">
        {/* Backend Environment Switcher (Local vs Render Live) */}
        <div className="backend-mode-pill" title={`Connected to: ${backendMode === 'live' ? 'Render Cloud (https://voiceagentbackend-klbc.onrender.com)' : 'Localhost (http://localhost:5000)'}`}>
          <button
            type="button"
            className={`mode-toggle-btn ${backendMode === 'local' ? 'active' : ''}`}
            onClick={() => onToggleBackendMode('local')}
          >
            <Laptop size={12} />
            <span>Local</span>
          </button>
          <button
            type="button"
            className={`mode-toggle-btn ${backendMode === 'live' ? 'active' : ''}`}
            onClick={() => onToggleBackendMode('live')}
          >
            <Cloud size={12} />
            <span>Render</span>
          </button>
        </div>

        <div className="nav-status">
          {isConnected ? (
            <span className="status-indicator online">
              <CheckCircle size={14} /> {backendMode === 'live' ? 'Render Live' : 'Local Connected'}
            </span>
          ) : (
            <span className="status-indicator offline">
              <AlertCircle size={14} /> Reconnecting...
            </span>
          )}
        </div>

        {user && (
          <div className="nav-user">
            <div className="user-avatar">{user.avatar}</div>
            <div className="user-info">
              <span className="user-name">{user.displayName}</span>
              <span className="user-role">{user.role}</span>
            </div>
            <button
              className="logout-btn"
              onClick={onLogout}
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
