import { Capacitor } from '@capacitor/core';

/**
 * Single source of truth for all environment-dependent URLs.
 */

const RAILWAY_URL = "https://roundu-app-production.up.railway.app";
const VERCEL_URL = "https://roundu-app.vercel.app"; // The proxy server

// If running natively on mobile (Capacitor), use the absolute Vercel proxy URL.
// If running on the web, use a relative path so Vercel handles the proxying directly.
export const API_BASE_URL = Capacitor.isNativePlatform()
  ? `${VERCEL_URL}/api/v1`
  : import.meta.env.PROD 
    ? "/api/v1" 
    : import.meta.env.VITE_API_URL || `${RAILWAY_URL}/api/v1`;

// Socket connects to the root origin
export const SOCKET_URL = (() => {
  if (Capacitor.isNativePlatform()) return VERCEL_URL;
  if (import.meta.env.PROD) return ""; // Empty string tells socket.io to use the current host (Vercel)
  
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/api\/v1\/?$/, "");
  }
  return RAILWAY_URL;
})();
