import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  Layers,
  DollarSign,
  FileText,
  X,
  ExternalLink,
  Info,
  Calendar,
  Sparkles,
  Bot,
  User
} from 'lucide-react';

export default function UsageDashboard({ metrics, sessions = [], onRefresh }) {
  const [selectedSession, setSelectedSession] = useState(null);

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
      {/* Top Banner & Header */}
      <div className="dashboard-header">
        <div>
          <h2>Usage & Cost Monitoring Dashboard</h2>
          <p className="subtitle">Real-time telemetry and Gemini API expenditure tracker</p>
        </div>
        <button className="btn-refresh" onClick={onRefresh}>
          Refresh Metrics
        </button>
      </div>

      {/* 5 High-Impact Metric Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-title">Active Sessions</span>
            <div className="metric-icon-wrap bg-emerald">
              <Activity size={20} className="text-emerald" />
            </div>
          </div>
          <div className="metric-value">
            {metrics?.activeSessions || 0}
            {metrics?.activeSessions > 0 && <span className="live-dot" />}
          </div>
          <span className="metric-sub">Currently connected</span>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-title">Total Sessions</span>
            <div className="metric-icon-wrap bg-blue">
              <CheckCircle2 size={20} className="text-blue" />
            </div>
          </div>
          <div className="metric-value">{metrics?.totalSessions || 0}</div>
          <span className="metric-sub">{metrics?.completedSessions || 0} completed</span>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-title">Cumulative Duration</span>
            <div className="metric-icon-wrap bg-purple">
              <Clock size={20} className="text-purple" />
            </div>
          </div>
          <div className="metric-value">{formatDuration(metrics?.totalDurationSeconds)}</div>
          <span className="metric-sub">Across all conversations</span>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-title">Total Tokens</span>
            <div className="metric-icon-wrap bg-indigo">
              <Layers size={20} className="text-indigo" />
            </div>
          </div>
          <div className="metric-value">{(metrics?.totalTokens || 0).toLocaleString()}</div>
          <span className="metric-sub">
            In: {(metrics?.totalInputTokens || 0).toLocaleString()} | Out: {(metrics?.totalOutputTokens || 0).toLocaleString()}
          </span>
        </div>

        <div className="metric-card highlight-cost">
          <div className="metric-top">
            <span className="metric-title">Running Cost</span>
            <div className="metric-icon-wrap bg-amber">
              <DollarSign size={20} className="text-amber" />
            </div>
          </div>
          <div className="metric-value cost-highlight">
            ${(metrics?.totalCost || 0).toFixed(5)}
          </div>
          <span className="metric-sub">Gemini 2.0 Flash Pricing</span>
        </div>
      </div>

      {/* Pricing Model Info Box */}
      <div className="pricing-box">
        <div className="pricing-title">
          <Info size={18} className="text-primary" />
          <span>Gemini 2.0 Flash Pricing Reference</span>
        </div>
        <div className="pricing-chips">
          <span className="chip">Text Input: <strong>$0.10 / 1M tokens</strong></span>
          <span className="chip">Text Output: <strong>$0.40 / 1M tokens</strong></span>
          <span className="chip">Audio Input: <strong>$0.70 / 1M tokens</strong> (~25 tokens/s)</span>
          <span className="chip">Audio Output: <strong>$2.00 / 1M tokens</strong> (~30 tokens/s)</span>
        </div>
      </div>

      {/* Real-Time Sessions Table */}
      <div className="sessions-table-card">
        <div className="table-header">
          <h3>Interaction Sessions</h3>
          <span className="badge-count">{sessions.length} recorded</span>
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
                  <th>Status</th>
                  <th>Session ID</th>
                  <th>Persona</th>
                  <th>Started</th>
                  <th>Duration</th>
                  <th>Tokens</th>
                  <th>Est. Cost</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span className={`status-pill ${s.status === 'active' ? 'active' : 'completed'}`}>
                        {s.status === 'active' ? 'Live' : 'Completed'}
                      </span>
                    </td>
                    <td>
                      <code className="session-id-code">{s.id.substring(0, 8)}...</code>
                    </td>
                    <td>
                      <span className="persona-tag">{s.persona?.name || 'Standard'}</span>
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
                      <button
                        className="btn-inspect"
                        onClick={() => setSelectedSession(s)}
                      >
                        <ExternalLink size={14} /> View Details
                      </button>
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
              <button className="btn-close" onClick={() => setSelectedSession(null)}>
                <X size={20} />
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
                            {t.role === 'user' ? <User size={14} /> : <Bot size={14} />}
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
