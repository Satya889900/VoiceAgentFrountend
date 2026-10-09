// Automatic Backend Configuration (Local Development & Render Production)
export const RENDER_BACKEND_URL = 'https://voiceagentbackend-klbc.onrender.com';
export const LOCAL_BACKEND_URL = 'http://localhost:5000';

/**
 * Check if running locally (localhost / 127.0.0.1)
 */
export function isLocalhost() {
  if (typeof window === 'undefined') return true;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
}

/**
 * Automatically determine backend base URL based on host environment
 */
export function getApiBaseUrl() {
  // 1. Explicit environment variable override
  if (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL) {
    return (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL).replace(/\/$/, '');
  }

  // 2. If running on localhost in development mode, use Vite proxy or local server
  if (isLocalhost() && import.meta.env.DEV) {
    return ''; // Relative path leverages vite.config.js proxy to localhost:5000
  }

  // 3. Otherwise, in production or live domains, automatically use Render cloud backend
  return RENDER_BACKEND_URL;
}

/**
 * Build endpoint URL
 * @param {string} path e.g. '/api/sessions/start'
 */
export function getApiUrl(path) {
  const base = getApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

/**
 * Automatically return the appropriate WebSocket URL
 */
export function getWsUrl() {
  // 1. Explicit override
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }

  // 2. If running on localhost in development mode
  if (isLocalhost() && import.meta.env.DEV) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.hostname}:5000/ws`;
  }

  // 3. In production / live server, automatically connect securely to Render WS
  const renderHost = RENDER_BACKEND_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return `wss://${renderHost}/ws`;
}
