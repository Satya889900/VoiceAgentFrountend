import React from 'react';
import { Mic, BarChart2, Radio, CheckCircle, AlertCircle, LogOut } from 'lucide-react';

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
        <div className="nav-status">
          {isConnected ? (
            <span className="status-indicator online">
              <CheckCircle size={14} /> Connected
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
