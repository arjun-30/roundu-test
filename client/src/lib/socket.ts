import { io } from "socket.io-client";
import { SOCKET_URL } from "@/config/env";
import { Capacitor } from "@capacitor/core";

const isNative = Capacitor.isNativePlatform();

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10,
  transports: ["websocket"],  // websocket-only: Railway has no sticky sessions for polling
  // withCredentials breaks WebSocket CORS on Android WebView — only enable on web
  withCredentials: !isNative,
});
