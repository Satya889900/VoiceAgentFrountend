import React from 'react';
import { Mic, BarChart2, CheckCircle, RotateCw, LogOut, ChevronDown, Activity } from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  activeSessionsCount,
  isConnected,
  user,
  onLogout,
}) {
  return (
    <nav className="navbar">
      {/* Brand Logo */}
      <div className="nav-brand">
        <div className="brand-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <rect x="2" y="8" width="2.5" height="8" rx="1.25" />
            <rect x="6.5" y="4" width="2.5" height="16" rx="1.25" />
            <rect x="11" y="2" width="2.5" height="20" rx="1.25" />
            <rect x="15.5" y="4" width="2.5" height="16" rx="1.25" />
            <rect x="20" y="8" width="2.5" height="8" rx="1.25" />
          </svg>
        </div>
        <div className="brand-text">
          <span className="brand-title">Gemini Voice Agent</span>
          <span className="brand-tag">MULTIMODAL AI STUDIO</span>
        </div>
      </div>

      {/* Central Pill Tabs */}
      <div className="nav-tabs">
        <button
          className={`tab-btn ${activeTab === 'agent' ? 'active' : ''}`}
          onClick={() => setActiveTab('agent')}
        >
          <Mic size={16} />
          <span>Voice Agent</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <BarChart2 size={16} />
          <span>Usage & Cost Dashboard</span>
          <span className="live-pill-badge">
            <span className="live-dot-mini" /> Live
          </span>
        </button>
      </div>

      {/* Right Section: Status & User */}
      <div className="nav-right">
        <div className="nav-status">
          {isConnected ? (
            <span className="status-badge connected">
              <CheckCircle size={13} /> Connected
            </span>
          ) : (
            <span className="status-badge reconnecting">
              <RotateCw size={13} className="spin-icon" /> Reconnecting...
            </span>
          )}
        </div>

        {user && (
          <div className="nav-user-pill" onClick={onLogout} title="Click to Sign Out">
            <div className="user-avatar-circle">{user.avatar || 'SP'}</div>
            <div className="user-details">
              <span className="user-display-name">{user.displayName || 'Satya Prakash'}</span>
              <span className="user-badge-role">{user.role || 'ADMIN'}</span>
            </div>
            <ChevronDown size={14} className="user-chevron" />
          </div>
        )}
      </div>
    </nav>
  );
}
