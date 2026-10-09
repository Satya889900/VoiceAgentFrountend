import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import VoiceAgent from './components/VoiceAgent';
import UsageDashboard from './components/UsageDashboard';
import Login from './components/Login';
import { Radio } from 'lucide-react';
import './App.css';

function App() {
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem('va_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [initialLoading, setInitialLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('agent');
  const [metrics, setMetrics] = useState({
    totalSessions: 0,
    activeSessions: 0,
    completedSessions: 0,
    totalDurationSeconds: 0,
    totalTokens: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalAudioSeconds: 0,
    totalCost: 0,
  });
  const [sessions, setSessions] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const wsRef = useRef(null);

  const handleLogin = (loggedInUser) => {
    sessionStorage.setItem('va_user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('va_user');
    setUser(null);
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

  // Fetch backend telemetry
  const fetchData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    try {
      const [resMetrics, resSessions, resPersonas] = await Promise.all([
        fetch('/api/metrics'),
        fetch('/api/sessions'),
        fetch('/api/personas'),
      ]);

      if (resMetrics.ok) {
        const m = await resMetrics.json();
        setMetrics(m);
      }
      if (resSessions.ok) {
        const s = await resSessions.json();
        setSessions(s);
      }
      if (resPersonas.ok) {
        const p = await resPersonas.json();
        setPersonas(p.personas || []);
      }
      setIsConnected(true);
    } catch (err) {
      console.warn('Backend fetch error:', err.message);
      setIsConnected(false);
    } finally {
      if (showRefreshIndicator) {
        setTimeout(() => setIsRefreshing(false), 350);
      }
      setInitialLoading(false);
    }
  };

  // Setup WebSocket + polling (only when logged in)
  useEffect(() => {
    if (!user) {
      setInitialLoading(false);
      return;
    }

    fetchData();

    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.hostname}:5000/ws`;

      try {
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => setIsConnected(true);

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'INIT' || data.type === 'METRICS_UPDATE') {
              if (data.metrics) setMetrics(data.metrics);
              if (data.sessions) setSessions(data.sessions);
            }
          } catch (e) {
            // ignore
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          if (user) setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = () => ws.close();

        wsRef.current = ws;
      } catch (err) {
        console.warn('WS connection failed, falling back to polling');
      }
    };

    connectWebSocket();

    const pollInterval = setInterval(() => fetchData(false), 5000);

    return () => {
      clearInterval(pollInterval);
      if (wsRef.current) wsRef.current.close();
    };
  }, [user]);

  const handleSessionUpdate = () => {
    fetchData(false);
  };

  // Initial Fullscreen Loader
  if (initialLoading && user) {
    return (
      <div className="loading-screen">
        <div className="loading-logo">
          <Radio size={32} />
        </div>
        <div className="loading-bar-wrap">
          <div className="loading-bar" />
        </div>
        <span className="loading-text">INITIALIZING VOICE AGENT STUDIO...</span>
      </div>
    );
  }

  // Show Login screen if not authenticated
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-shell">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeSessionsCount={metrics?.activeSessions || 0}
        isConnected={isConnected}
        user={user}
        onLogout={handleLogout}
      />

      <main className="main-content">
        {activeTab === 'agent' ? (
          <VoiceAgent
            personas={personas}
            onSessionUpdate={handleSessionUpdate}
          />
        ) : (
          <UsageDashboard
            metrics={metrics}
            sessions={sessions}
            onRefresh={() => fetchData(true)}
            isRefreshing={isRefreshing}
          />
        )}
      </main>
    </div>
  );
}

export default App;
