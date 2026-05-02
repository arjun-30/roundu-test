/**
 * Single source of truth for all environment-dependent URLs.
 * 
 * Priority: VITE_API_URL env var → Railway production URL
 */

const RAILWAY_URL = "roundu-app-production.up.railway.app";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||          // e.g. http://172.20.10.2:5000/api/v1
  `${RAILWAY_URL}/api/v1`;                  // production fallback

// Socket connects to the root origin, not /api/v1
export const SOCKET_URL = (() => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    // Strip /api/v1 suffix to get the server root
    return envUrl.replace(/\/api\/v1\/?$/, "");
  }
  return RAILWAY_URL;
})();
