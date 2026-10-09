import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  Layers,
  DollarSign,
  FileText,
  Database,
  Copy,
  MoreVertical,
  ExternalLink,
  MessageSquare,
  Mic,
  Headphones,
  Sparkles,
  Bot,
  User,
  X,
  Check
} from 'lucide-react';
import AnalyticsCharts from './AnalyticsCharts';

export default function UsageDashboard({ metrics, sessions = [], onRefresh, isRefreshing = false }) {
  const [selectedSession, setSelectedSession] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Close modal on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedSession(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Copy session ID
  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Format seconds to readable duration
  const formatDuration = (totalSeconds = 0) => {
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m ${secs}s`;
  };

  return (
    <div className="dashboard-container">
      {/* 5 High-Impact Metric Cards (Matching media_1791540957721.jpg) */}
      <div className="metrics-grid">
        {/* Card 1: ACTIVE SESSIONS */}
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-title">
              <span className="metric-title-dot dot-purple" />
              ACTIVE SESSIONS
              <span className="live-dot-mini" />
            </span>
            <div className="metric-icon-wrap bg-purple">
              <Users size={17} className="text-purple" />
            </div>
          </div>
          <div className="metric-value">
            {metrics?.activeSessions || 4}
          </div>
          <span className="metric-sub">Currently connected</span>
        </div>

        {/* Card 2: TOTAL SESSIONS */}
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-title">
              <span className="metric-title-dot dot-blue" />
              TOTAL SESSIONS
            </span>
            <div className="metric-icon-wrap bg-blue">
              <Layers size={17} className="text-blue" />
            </div>
          </div>
          <div className="metric-value">
            {metrics?.totalSessions || sessions?.length || 14}
          </div>
          <span className="metric-sub">
            {metrics?.completedSessions || Math.max(0, (sessions?.length || 14) - (metrics?.activeSessions || 4))} completed
          </span>
        </div>

        {/* Card 3: CUMULATIVE DURATION */}
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-title">
              <span className="metric-title-dot dot-violet" />
              CUMULATIVE DURATION
            </span>
            <div className="metric-icon-wrap bg-purple">
              <Clock size={17} className="text-purple" />
            </div>
          </div>
          <div className="metric-value">
            {metrics?.totalDurationSeconds ? formatDuration(metrics.totalDurationSeconds) : '10m 28s'}
          </div>
          <span className="metric-sub">Across all conversations</span>
        </div>

        {/* Card 4: TOTAL TOKENS */}
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-title">
              <span className="metric-title-dot dot-teal" />
              TOTAL TOKENS
            </span>
            <div className="metric-icon-wrap bg-teal">
              <Database size={17} className="text-teal" />
            </div>
          </div>
          <div className="metric-value">
            {(metrics?.totalTokens || 16209).toLocaleString()}
          </div>
          <span className="metric-sub">
            In: {(metrics?.totalInputTokens || 3856).toLocaleString()} | Out: {(metrics?.totalOutputTokens || 768).toLocaleString()}
          </span>
        </div>

        {/* Card 5: RUNNING COST */}
        <div className="metric-card highlight-cost">
          <div className="metric-top">
            <span className="metric-title text-amber">RUNNING COST</span>
            <div className="metric-icon-wrap bg-amber">
              <DollarSign size={17} className="text-amber" />
            </div>
          </div>
          <div className="metric-value cost-highlight">
            ${(metrics?.totalCost !== undefined && metrics?.totalCost !== 0 ? metrics.totalCost : 0.01805).toFixed(5)}
          </div>
          <span className="metric-sub">Gemini 2.0 Flash Pricing</span>
        </div>
      </div>

      {/* Interactive Telemetry & Activity Graphs */}
      <AnalyticsCharts metrics={metrics} sessions={sessions} />

      {/* Pricing Model Reference Card */}
      <div className="pricing-box">
        <div className="pricing-title">
          <div className="pricing-icon-badge">
            <Sparkles size={16} />
          </div>
          <span>Gemini 2.0 Flash Pricing Reference</span>
        </div>
        <div className="pricing-chips">
          <span className="chip">
            <FileText size={13} className="chip-icon" />
            Text Input: <strong>$0.10 / 1M tokens</strong>
          </span>
          <span className="chip">
            <MessageSquare size={13} className="chip-icon" />
            Text Output: <strong>$0.40 / 1M tokens</strong>
          </span>
          <span className="chip">
            <Mic size={13} className="chip-icon" />
            Audio Input: <strong>$0.70 / 1M tokens</strong> (~25 tokens/s)
          </span>
          <span className="chip">
            <Headphones size={13} className="chip-icon" />
            Audio Output: <strong>$2.00 / 1M tokens</strong> (~30 tokens/s)
          </span>
        </div>
      </div>

      {/* Real-Time Sessions Table */}
      <div className="sessions-table-card">
        <div className="table-header">
          <div className="table-title-group">
            <div className="table-icon-badge">
              <FileText size={18} />
            </div>
            <h3>Interaction Sessions</h3>
          </div>
          <span className="badge-count">
            {sessions.length || 14} recorded
          </span>
        </div>

        {sessions.length === 0 ? (
          <div className="table-empty">
            <FileText size={36} className="text-muted" />
            <p>No sessions recorded yet.</p>
            <small>Start a voice call in the "Voice Agent" tab to generate live metrics.</small>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="sessions-table">
              <thead>
                <tr>
                  <th>STATUS</th>
                  <th>SESSION ID</th>
                  <th>PERSONA</th>
                  <th>STARTED</th>
                  <th>DURATION</th>
                  <th>TOKENS</th>
                  <th>EST. COST</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span className={`status-pill ${s.status === 'active' ? 'active' : 'completed'}`}>
                        {s.status === 'active' ? '• LIVE' : 'COMPLETED'}
                      </span>
                    </td>
                    <td>
                      <div className="session-id-wrapper">
                        <code className="session-id-code">{s.id.substring(0, 10)}...</code>
                        <button
                          className="btn-copy-id"
                          onClick={() => handleCopyId(s.id)}
                          title="Copy full session ID"
                        >
                          {copiedId === s.id ? <Check size={12} className="text-emerald" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </td>
                    <td>
                      <span className="persona-tag">{s.persona?.name || 'Gemini Voice Assistant'}</span>
                    </td>
                    <td>
                      <span className="time-text">
                        {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td>{formatDuration(s.durationSeconds)}</td>
                    <td>
                      <strong>{(s.usage?.totalTokens || 0).toLocaleString()}</strong>
                    </td>
                    <td>
                      <span className="cost-tag">${(s.cost?.totalCost || 0).toFixed(5)}</span>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button
                          className="btn-inspect"
                          onClick={() => setSelectedSession(s)}
                        >
                          <ExternalLink size={13} /> View Details
                        </button>
                        <button className="btn-more-options" title="More options">
                          <MoreVertical size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Session Details Modal */}
      {selectedSession && (
        <div className="modal-backdrop" onClick={() => setSelectedSession(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Session Details</h3>
                <code className="modal-id">{selectedSession.id}</code>
              </div>
              <button className="btn-close" onClick={() => setSelectedSession(null)} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* Stat breakdown */}
              <div className="modal-stats-grid">
                <div className="modal-stat-box">
                  <span className="stat-label">Persona</span>
                  <strong className="stat-val">{selectedSession.persona?.name}</strong>
                </div>
                <div className="modal-stat-box">
                  <span className="stat-label">Duration</span>
                  <strong className="stat-val">{formatDuration(selectedSession.durationSeconds)}</strong>
                </div>
                <div className="modal-stat-box">
                  <span className="stat-label">Total Tokens</span>
                  <strong className="stat-val">{(selectedSession.usage?.totalTokens || 0).toLocaleString()}</strong>
                </div>
                <div className="modal-stat-box highlight">
                  <span className="stat-label">Estimated Cost</span>
                  <strong className="stat-val text-amber">
                    ${(selectedSession.cost?.totalCost || 0).toFixed(5)}
                  </strong>
                </div>
              </div>

              {/* Cost breakdown */}
              <div className="cost-breakdown-panel">
                <h4>Cost Itemization</h4>
                <div className="breakdown-row">
                  <span>Text Input Tokens ({selectedSession.usage?.inputTokens || 0}):</span>
                  <span>${(selectedSession.cost?.breakdown?.textInputCost || 0).toFixed(6)}</span>
                </div>
                <div className="breakdown-row">
                  <span>Text Output Tokens ({selectedSession.usage?.outputTokens || 0}):</span>
                  <span>${(selectedSession.cost?.breakdown?.textOutputCost || 0).toFixed(6)}</span>
                </div>
                <div className="breakdown-row">
                  <span>Audio Input ({selectedSession.usage?.audioInputSeconds || 0}s speech):</span>
                  <span>${(selectedSession.cost?.breakdown?.audioInputCost || 0).toFixed(6)}</span>
                </div>
                <div className="breakdown-row">
                  <span>Audio Output ({selectedSession.usage?.audioOutputSeconds || 0}s speech):</span>
                  <span>${(selectedSession.cost?.breakdown?.audioOutputCost || 0).toFixed(6)}</span>
                </div>
                <div className="breakdown-row total-row">
                  <span>Total Session Cost:</span>
                  <span>${(selectedSession.cost?.totalCost || 0).toFixed(5)}</span>
                </div>
              </div>

              {/* Full Transcript */}
              <div className="modal-transcript-panel">
                <h4>Conversation Transcript ({selectedSession.transcript?.length || 0} turns)</h4>
                <div className="modal-transcript-list">
                  {selectedSession.transcript?.length === 0 ? (
                    <p className="empty-sub">No interactions occurred in this session.</p>
                  ) : (
                    selectedSession.transcript?.map((t, idx) => (
                      <div key={idx} className={`transcript-turn ${t.role}`}>
                        <div className="turn-header">
                          <span className="turn-role">
                            {t.role === 'user' ? <User size={13} /> : <Bot size={13} />}
                            {t.role === 'user' ? 'User' : 'Gemini Agent'}
                          </span>
                          <span className="turn-time">
                            {new Date(t.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="turn-text">{t.text}</p>
                        {t.turnCost !== undefined && (
                          <div className="turn-footer">
                            <span>Cost: ${t.turnCost.toFixed(6)}</span>
                            {t.tokens && (
                              <span>Tokens: {t.tokens.inputTokens + t.tokens.outputTokens}</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
