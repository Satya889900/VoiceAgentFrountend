// Backend Configuration: Dual-Mode (Local + Live Render)
export const RENDER_BACKEND_URL = 'https://voiceagentbackend-klbc.onrender.com';
export const LOCAL_BACKEND_URL = 'http://localhost:5000';

const BACKEND_STORAGE_KEY = 'va_backend_mode';

/**
 * Check if running on localhost / loopback
 */
export function isLocalhost() {
  if (typeof window === 'undefined') return true;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
}

/**
 * Get active mode: 'local' | 'live'
 */
export function getBackendMode() {
  // If explicitly set via env var
  if (import.meta.env.VITE_BACKEND_MODE) {
    return import.meta.env.VITE_BACKEND_MODE;
  }

  // Check saved preference in localStorage
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(BACKEND_STORAGE_KEY);
    if (saved === 'local' || saved === 'live') {
      return saved;
    }
  }

  // If in production environment (e.g. deployed on Vercel/Netlify), default to Render
  if (!isLocalhost() || import.meta.env.PROD) {
    return 'live';
  }

  // Default to local when working on localhost
  return 'local';
}

/**
 * Switch backend mode ('local' or 'live') and notify listeners
 */
export function setBackendMode(mode) {
  if (mode !== 'local' && mode !== 'live') return;
  if (typeof window !== 'undefined') {
    localStorage.setItem(BACKEND_STORAGE_KEY, mode);
    window.dispatchEvent(new CustomEvent('va:backend_mode_change', { detail: mode }));
  }
}

/**
 * Returns the base HTTP URL for API requests
 */
export function getApiBaseUrl() {
  // Direct override via env variable
  if (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL) {
    return (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL).replace(/\/$/, '');
  }

  const mode = getBackendMode();
  if (mode === 'live') {
    return RENDER_BACKEND_URL;
  }

  // When developing locally with Vite proxy
  if (isLocalhost() && import.meta.env.DEV) {
    return ''; // relative path uses vite.config.js proxy to localhost:5000
  }

  return LOCAL_BACKEND_URL;
}

/**
 * Build full API endpoint URL
 * @param {string} path e.g. '/api/health' or '/api/sessions/start'
 */
export function getApiUrl(path) {
  const base = getApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

/**
 * Returns the WebSocket URL for live telemetry & voice stream
 */
export function getWsUrl() {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }

  const mode = getBackendMode();
  if (mode === 'live') {
    const renderHost = RENDER_BACKEND_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return `wss://${renderHost}/ws`;
  }

  // Local WebSocket
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.hostname}:5000/ws`;
  }

  return 'ws://localhost:5000/ws';
}
