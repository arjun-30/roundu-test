import { io } from "socket.io-client";

const VITE_API_URL = import.meta.env.VITE_API_URL;
const SOCKET_URL = VITE_API_URL ? VITE_API_URL.split('/api/v1')[0] : "http://localhost:5000";

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  transports: ['websocket', 'polling'],
});
