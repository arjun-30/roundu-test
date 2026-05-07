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

    socket.on('register', (data) => {
      socket.data.userId = data.userId;
      socket.data.role = data.role;
      if (data.role === 'provider') {
        socket.join('providers');
        
        // Join service-specific rooms
        if (Array.isArray(data.serviceIds)) {
          data.serviceIds.forEach((serviceId: string) => {
            socket.join(`service:${serviceId}`);
            console.log(`[socket] provider ${data.userId} joined service room: service:${serviceId}`);
          });
        }
        
        console.log(`[socket] provider ${data.userId} joined providers room via register`);
      }
    });

    socket.on('join_provider', () => {
      socket.join('providers');
      console.log(`[socket] ${socket.id} joined providers room via join_provider`);
    });

    socket.on('new_booking', async (data) => {
      console.log(`[socket] new_booking received: ${data.id} for service: ${data.serviceId}`);
      const payload = {
        id: `req-${data.id}`,
        customerName: data.customerName || "Customer",
        serviceId: data.serviceId,
        providerId: data.providerId,
        lat: data.lat,
        lng: data.lng,
        address: data.address || "Client Address",
        date: data.date,
        time: data.time,
        price: data.price,
        status: "pending",
        notes: data.notes,
        voiceNote: data.voice_note || false
      };

      const providerSockets = await io.in('providers').fetchSockets();

      if (providerSockets.length > 0) {
        // 1. Specific provider targeted
        if (data.providerId && data.providerId !== 'searching') {
          const specificProvider = providerSockets.find(s => s.data.userId === data.providerId);
          if (specificProvider) {
            specificProvider.emit('incoming_request', payload);
            return;
          }
        }
        
        // 2. Broadcast to specific service room (e.g., only plumbers)
        console.log(`[socket] broadcasting to room: service:${data.serviceId}`);
        io.to(`service:${data.serviceId}`).emit('incoming_request', payload);
      } else {
        // Fallback for development/compatibility: broadcast to all others if no registered providers
        socket.broadcast.emit('incoming_request', payload);
      }
    });

    socket.on('broadcast_job', (data) => {
      console.log(`[socket] broadcast_job received for ${data.serviceId}`);
      // Send to all providers
      io.emit('incoming_broadcast', {
        broadcastId: data.broadcastId,
        customerId: data.customerId,
        customerName: data.customerName || "Customer",
        serviceId: data.serviceId,
        address: data.address || "Client Address",
        date: data.date,
        time: data.time,
        notes: data.notes,
        status: "active",
        createdAt: Date.now()
      });
    });

    socket.on('submit_quote', (data) => {
      console.log(`[socket] submit_quote for ${data.broadcastId} from provider ${data.providerId}`);
      io.emit('quote_received', {
        broadcastId: data.broadcastId,
        providerId: data.providerId,
        providerName: data.providerName,
        providerAvatar: data.providerAvatar,
        price: data.price,
        rating: data.rating,
        distanceKm: data.distanceKm,
        etaMin: data.etaMin,
        reviews: data.reviews,
        submittedAt: Date.now()
      });
    });

    socket.on('provider_location', (data) => {
      socket.broadcast.emit('provider_location_update', data);
    });

    socket.on('update_job_status', (data) => {
      console.log(`[socket] update_job_status for booking ${data.bookingId} to ${data.status}`);
      io.emit('job_status_updated', {
        bookingId: data.bookingId,
        status: data.status,
        timestamp: Date.now()
      });
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
