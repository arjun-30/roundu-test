import { Capacitor } from "@capacitor/core";

/**
 * Single source of truth for all environment-dependent URLs.
 */

const RAILWAY_URL = "https://roundu-app-production.up.railway.app";
const VERCEL_URL = "https://roundu-app.vercel.app"; // The proxy server

// If running natively on mobile (Capacitor), use the absolute Vercel proxy URL.
// If running on the web, use a relative path so Vercel handles the proxying directly.
export const API_BASE_URL = Capacitor.isNativePlatform()
  ? `${VERCEL_URL}/api`
  : import.meta.env.PROD 
  ? "/api" 
  : import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// Socket connects directly to the backend to avoid Vercel's Serverless Proxy dropping WebSockets
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";
