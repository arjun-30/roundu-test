/**
 * Single source of truth for all environment-dependent URLs.
 * 
 * Priority: VITE_API_URL env var → Railway production URL
 */

const RAILWAY_URL = "https://roundu-app-production.up.railway.app";

export const API_BASE_URL = import.meta.env.PROD 
  ? "/api/v1" 
  : import.meta.env.VITE_API_URL || `${RAILWAY_URL}/api/v1`;

// Socket connects to the root origin, not /api/v1
export const SOCKET_URL = (() => {
  if (import.meta.env.PROD) return ""; // Empty string tells socket.io to use the current host (Vercel)
  
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    // Strip /api/v1 suffix to get the server root
    return envUrl.replace(/\/api\/v1\/?$/, "");
  }
  return RAILWAY_URL;
})();
