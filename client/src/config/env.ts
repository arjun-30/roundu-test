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

// Socket connects directly to the backend to avoid Vercel's Serverless Proxy dropping WebSockets
export const SOCKET_URL = import.meta.env.DEV 
  ? (import.meta.env.VITE_API_URL || "http://172.16.96.129:3000")
  : RAILWAY_URL;
