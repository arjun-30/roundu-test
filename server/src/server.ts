/// <reference path="./types/express.d.ts" />
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import { env } from './config/env';
import { getPool, closePool } from './config/database';
import { createApp } from './app';

async function main() {
  console.log(`[server] Starting RoundU backend on port ${process.env.PORT || 5000}...`);
  const db = getPool();
  try {
    await db.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS voice_note BOOLEAN DEFAULT false;');
    console.log('[server] Database schema up to date.');
  } catch (err) {
    console.error('[server] Migration error:', err);
  }
  const app = createApp({ db });

  const port = Number(process.env.PORT) || 5000;
  const httpServer = app.listen(port, '0.0.0.0', () => {
    console.log(`[server] listening on port ${port} (${env.NODE_ENV})`);
    console.log(`[server] Allowed CORS origins: ${env.corsOrigins.join(', ')}`);
  });

  const io = new SocketServer(httpServer, {
    path: "/socket.io/",
    cors: { 
      origin: true, // Echo origin to bypass CORS
      credentials: true,
      methods: ["GET", "POST"]
    },
    allowEIO3: true,
    transports: ['polling', 'websocket']
  });

  app.locals.io = io;

  io.on('connection', (socket) => {
    if (env.isDevelopment) {
      console.log(`[socket] client connected: ${socket.id}`);
    }

    socket.on('join_provider', () => {
      socket.join('providers');
      console.log(`[socket] ${socket.id} joined providers room`);
    });

    socket.on('new_booking', (data) => {
      console.log(`[socket] new_booking received: ${data.id}`);
      // Broadcast to ALL connected sockets — every client filters on their own role
      io.emit('incoming_request', {
        id: `req-${data.id}`,
        customerName: data.customerName || "Customer",
        serviceId: data.serviceId,
        address: data.address || "Client Address",
        date: data.date,
        time: data.time,
        price: data.price,
        status: "pending",
        notes: data.notes,
        voiceNote: data.voice_note || false
      });
    });

    socket.on('provider_location', (data) => {
      socket.broadcast.emit('provider_location_update', data);
    });

    socket.on('disconnect', () => {
      if (env.isDevelopment) {
        console.log(`[socket] client disconnected: ${socket.id}`);
      }
    });
  });

  const shutdown = async (signal: string) => {
    console.log(`[server] received ${signal}, shutting down...`);
    io.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    await closePool();
    console.log('[server] shutdown complete');
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[server] fatal startup error:', err);
  process.exit(1);
});
