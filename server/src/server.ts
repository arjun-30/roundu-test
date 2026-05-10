/// <reference path="./types/express.d.ts" />
import http from 'http';
import { Server } from 'socket.io';
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

  const io = new Server(httpServer, {
    path: "/socket.io/",
    cors: { 
      origin: true, // Echo origin to bypass CORS
      credentials: true,
      methods: ["GET", "POST"]
    },
    allowEIO3: true,
    transports: ['websocket']   // websocket-only: no sticky sessions on Railway
  });

  app.locals.io = io;
  const activeBroadcasts = new Map<string, any>();

  // Version endpoint — confirms which code Railway is running
  app.get('/version', (_req: any, res: any) => {
    res.json({ version: 'v2-echo-sender', providers_room: true, sender_echo: true, ts: Date.now() });
  });

  io.on('connection', (socket: any) => {
    if (env.isDevelopment) {
      console.log(`[socket] client connected: ${socket.id}`);
    }

    socket.on('register', async (data: any) => {
      socket.data.userId = data.userId;
      socket.data.role = data.role;
      
      // Join user-specific room
      if (data.userId) {
        socket.join(`user:${data.userId}`);
        console.log(`[socket] user ${data.userId} joined room: user:${data.userId}`);
      }

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

    socket.on('join_job_room', (data: { jobId: string }) => {
      const room = `job:${data.jobId}`;
      socket.join(room);
      console.log(`[socket] ${socket.id} joined room: ${room}`);
    });

    socket.on('new_booking', async (data: any) => {
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
        const target = sockets.find((s: any) => s.data.userId === data.providerId);
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

    socket.on('broadcast_job', (data: any) => {
      console.log(`[socket] broadcast_job: id=${data.broadcastId}, service=${data.serviceId}`);
      
      // Deduplicate: if this broadcastId was already emitted, skip
      if (activeBroadcasts.has(data.broadcastId)) {
        console.log(`[socket] duplicate broadcast_job skipped: ${data.broadcastId}`);
        return;
      }
      
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

      // Auto-expire after 10 minutes
      setTimeout(() => activeBroadcasts.delete(data.broadcastId), 10 * 60 * 1000);

      // Always emit to BOTH the service room AND the providers room.
      const roomName = `service:${data.serviceId}`;
      io.to(roomName).emit('incoming_broadcast', broadcastPayload);
      io.to('providers').emit('incoming_broadcast', broadcastPayload);
      // Also echo directly back to sender (for debug/test)
      socket.emit('incoming_broadcast', broadcastPayload);
      console.log(`[socket] broadcast sent to ${roomName} + providers room + sender echo`);
    });

    socket.on('accept_quote', (data: any) => {
      console.log(`[socket] accept_quote for ${data.broadcastId} by ${data.acceptedProviderId}, bookingId=${data.bookingId}`);
      
      const broadcast = activeBroadcasts.get(data.broadcastId);
      const serviceId = data.serviceId || broadcast?.serviceId;
      const customerName = data.customerName || broadcast?.customerName || 'Customer';
      const address = data.address || broadcast?.address || '';

      if (broadcast || data.bookingId) {
        // Notify other providers in the service room the job is taken
        if (serviceId) {
          io.to(`service:${serviceId}`).emit('job_taken', { 
            broadcastId: data.broadcastId, 
            acceptedProviderId: data.acceptedProviderId 
          });
        }
        
        // ✅ Notify the WINNING provider with full job details
        io.to(`user:${data.acceptedProviderId}`).emit('quote_accepted', { 
          broadcastId: data.broadcastId,
          bookingId: data.bookingId,
          serviceId,
          customerName,
          address,
          lat: data.lat || null,
          lng: data.lng || null,
          price: data.price || 0,
          date: new Date().toISOString().slice(0, 10),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'assigned',
        });
        
        console.log(`[socket] quote_accepted sent to user:${data.acceptedProviderId} for booking ${data.bookingId}`);
        
        // Remove from active broadcasts
        if (broadcast) activeBroadcasts.delete(data.broadcastId);
      } else {
        console.warn(`[socket] accept_quote: no broadcast found for ${data.broadcastId}`);
      }
    });

    socket.on('submit_quote', (data: any) => {
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

    socket.on('provider_location_update', (data: { jobId: string; lat: number; lng: number }) => {
      const room = `job:${data.jobId}`;
      socket.to(room).emit('provider_location_update', { lat: data.lat, lng: data.lng });
    });

    socket.on('update_job_status', async (data: any) => {
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
        quote: data.quote || null,
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
