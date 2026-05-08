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
  const activeBroadcasts = new Map<string, any>();

  io.on('connection', (socket) => {
    if (env.isDevelopment) {
      console.log(`[socket] client connected: ${socket.id}`);
    }

    socket.on('register', async (data) => {
      socket.data.userId = data.userId;
      socket.data.role = data.role;
      if (data.role === 'provider') {
        socket.join('providers');
        
        let serviceIds: string[] = Array.isArray(data.serviceIds) ? data.serviceIds : [];
        
        // If client didn't send serviceIds, fetch from DB as fallback
        if (serviceIds.length === 0 && data.userId) {
          try {
            const { getPool } = await import('./config/database');
            const res = await getPool().query(
              `SELECT ps.service_id FROM provider_services ps
               JOIN providers p ON ps.provider_id = p.id
               WHERE p.user_id = $1`,
              [data.userId]
            );
            serviceIds = res.rows.map((r: any) => r.service_id);
            console.log(`[socket] fetched serviceIds from DB for ${data.userId}:`, serviceIds);
          } catch (err) {
            console.error('[socket] failed to fetch serviceIds from DB:', err);
          }
        }
        
        // Join service-specific rooms
        serviceIds.forEach((serviceId: string) => {
          const roomName = `service:${serviceId}`;
          socket.join(roomName);
          console.log(`[socket] provider ${data.userId} joined room: ${roomName}`);
        });
        
        // Send active broadcasts for their services
        activeBroadcasts.forEach((payload, id) => {
          if (serviceIds.includes(payload.serviceId)) {
            socket.emit('incoming_broadcast', payload);
            console.log(`[socket] sent active broadcast ${id} to newly registered provider ${data.userId}`);
          }
        });
        
        console.log(`[socket] provider ${data.userId} fully registered`);
      }
    });

    socket.on('join_provider', () => {
      socket.join('providers');
      console.log(`[socket] ${socket.id} joined generic providers room`);
    });

    socket.on('new_booking', async (data) => {
      console.log(`[socket] new_booking: id=${data.id}, service=${data.serviceId}, target=${data.providerId}`);
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

      // 1. Direct Target
      if (data.providerId && data.providerId !== 'searching') {
        const sockets = await io.in('providers').fetchSockets();
        const target = sockets.find(s => s.data.userId === data.providerId);
        if (target) {
          target.emit('incoming_request', payload);
          console.log(`[socket] direct request sent to provider ${data.providerId}`);
          return;
        }
      }
      
      // 2. Room-based Broadcast
      const roomName = `service:${data.serviceId}`;
      console.log(`[socket] broadcasting request to room: ${roomName}`);
      io.to(roomName).emit('incoming_request', payload);
      
      // 3. Optional: broadcast to 'providers' room as well if roomName might be empty
      // but to avoid double notification we rely on service room.
    });

    socket.on('broadcast_job', (data) => {
      console.log(`[socket] broadcast_job: id=${data.broadcastId}, service=${data.serviceId}`);
      const broadcastPayload = {
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
      };

      // Store in active broadcasts
      activeBroadcasts.set(data.broadcastId, broadcastPayload);

      // Target only relevant service room
      const roomName = `service:${data.serviceId}`;
      console.log(`[socket] broadcasting job to room: ${roomName}`);
      io.to(roomName).emit('incoming_broadcast', broadcastPayload);
    });

    socket.on('accept_quote', (data) => {
      console.log(`[socket] accept_quote for ${data.broadcastId} by ${data.acceptedProviderId}`);
      
      const broadcast = activeBroadcasts.get(data.broadcastId);
      if (broadcast) {
        // Notify other providers in the service room
        const roomName = `service:${broadcast.serviceId}`;
        io.to(roomName).emit('job_taken', { 
          broadcastId: data.broadcastId, 
          acceptedProviderId: data.acceptedProviderId 
        });
        
        // Remove from active broadcasts
        activeBroadcasts.delete(data.broadcastId);
      }
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

    socket.on('update_job_status', async (data) => {
      console.log(`[socket] update_job_status for booking ${data.bookingId} to ${data.status}`);
      
      // Persist to DB
      const dbId = data.bookingId.replace('req-', '');
      try {
        const { BookingModel } = require('./models/booking.model');
        await BookingModel.updateStatus(dbId, data.status);
      } catch (err) {
        console.error('[socket] Failed to update booking status in DB:', err);
      }

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
