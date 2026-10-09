import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import VoiceAgent from './components/VoiceAgent';
import UsageDashboard from './components/UsageDashboard';
import './App.css';

function App() {
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
  const wsRef = useRef(null);

  // Fetch initial data
  const fetchData = async () => {
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
    }
  };

  // Setup WebSocket connection for live telemetry updates
  useEffect(() => {
    fetchData();

    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // In Vite dev proxy, /ws is proxied to backend port 5000, or connect directly to 5000 if needed
      const wsUrl = `${protocol}//${window.location.hostname}:5000/ws`;

      try {
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setIsConnected(true);
        };

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
          // Try to reconnect in 3s
          setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = () => {
          ws.close();
        };

        wsRef.current = ws;
      } catch (err) {
        console.warn('WS connection failed, falling back to polling');
      }
    };

    connectWebSocket();

    // Fallback polling every 5s
    const pollInterval = setInterval(fetchData, 5000);

    return () => {
      clearInterval(pollInterval);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const handleSessionUpdate = (updatedSession) => {
    fetchData();
  };

  return (
    <div className="app-shell">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeSessionsCount={metrics?.activeSessions || 0}
        isConnected={isConnected}
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
            onRefresh={fetchData}
          />
        )}
      </main>
    </div>
  );
}

export default App;
