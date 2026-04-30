/// <reference path="./types/express.d.ts" />
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import { env } from './config/env';
import { getPool, closePool } from './config/database';
import { createApp } from './app';

async function main() {
  const db = getPool();
  
  // 1. Create the Express app first
  const app = createApp({ db });
  
  // 2. Create the HTTP server using the Express app
  const httpServer = http.createServer(app);
  
  // 3. Initialize Socket.IO on the HTTP server
  const io = new SocketServer(httpServer, {
    cors: { 
      origin: "*", 
      methods: ["GET", "POST"],
      credentials: true 
    },
  });

  // Attach io to app locals so controllers can use it
  app.locals.io = io;

  io.on('connection', (socket) => {
    if (env.isDevelopment) {
      console.log(`[socket] client connected: ${socket.id}`);
    }

    socket.on('new_booking', (data) => {
      console.log(`[socket] new_booking received: ${data.id}`);
      socket.broadcast.emit('incoming_request', {
        id: `req-${data.id}`,
        customerName: data.customerName || "Customer",
        serviceId: data.serviceId,
        address: data.address || "Client Address",
        date: data.date,
        time: data.time,
        price: data.price,
        status: "pending",
        notes: data.notes
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

  await new Promise<void>((resolve) => {
    httpServer.listen(env.PORT, '0.0.0.0', () => {
      console.log(`[server] listening on port ${env.PORT} (${env.NODE_ENV})`);
      console.log(`[server] Allowed CORS origins: ${env.corsOrigins.join(', ')}`);
      resolve();
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
