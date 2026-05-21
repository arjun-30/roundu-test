/// <reference path="./types/express.d.ts" />
import http from 'http';
import { Server } from 'socket.io';
import { env } from './config/env';
import { getPool, closePool } from './config/database';
import { createApp } from './app';
import { ChatModel } from './models/chat.model';

async function main() {
  console.log(`[server] Starting RoundU backend on port ${process.env.PORT || 5000}...`);
  const db = getPool();
  try {
    await db.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS voice_note BOOLEAN DEFAULT false;');
    await db.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS voice_note_url TEXT;');
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
      credentials: false, // Allow non-credentialed connections from Android WebView
      methods: ["GET", "POST"]
    },
    allowEIO3: true,
    transports: ['websocket']   // websocket-only: no sticky sessions on Railway
  });

  app.locals.io = io;
  const activeBroadcasts = new Map<string, any>();
  const onlineUserConnections = new Map<string, Set<string>>();

  io.on('connection', (socket: any) => {
    if (env.isDevelopment) {
      console.log(`[socket] client connected: ${socket.id}`);
    }

    const broadcastStatus = (userId: string, isOnline: boolean) => {
      io.emit('user_status_changed', { userId, isOnline });
    };

    socket.on('register', async (data: any) => {
      socket.data.userId = data.userId;
      socket.data.role = data.role;
      
      // Join user-specific room
      if (data.userId) {
        socket.join(`user:${data.userId}`);
        console.log(`[socket] user ${data.userId} joined room: user:${data.userId}`);
        
        // Track online status
        let userSockets = onlineUserConnections.get(data.userId);
        if (!userSockets) {
          userSockets = new Set();
          onlineUserConnections.set(data.userId, userSockets);
          broadcastStatus(data.userId, true); // First connection
        }
        userSockets.add(socket.id);
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
        
        // Send active broadcasts for their services (skip expired ones — 120s popup TTL)
        const BROADCAST_TTL_MS = 120 * 1000;
        activeBroadcasts.forEach((payload, id) => {
          if (serviceIds.includes(payload.serviceId)) {
            const age = Date.now() - (payload.createdAt || 0);
            if (age > BROADCAST_TTL_MS) {
              console.log(`[socket] skipping expired broadcast ${id} (age: ${Math.floor(age/1000)}s) for provider ${data.userId}`);
              return;
            }
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
      
      const isNew = !activeBroadcasts.has(data.broadcastId);

      const broadcastPayload = isNew
        ? {
            broadcastId: data.broadcastId,
            customerId: data.customerId,
            customerName: data.customerName || "Customer",
            serviceId: data.serviceId,
            address: data.address || "Client Address",
            lat: data.lat ?? null,
            lng: data.lng ?? null,
            date: data.date,
            time: data.time,
            notes: data.notes,
            voiceNote: data.voiceNote || false,
            voiceNoteUrl: data.voiceNoteUrl || null,
            status: "active",
            createdAt: Date.now()   // only set on first emit so TTL is accurate
          }
        : activeBroadcasts.get(data.broadcastId); // reuse stored payload (preserves createdAt)

      if (isNew) {
        // Store and schedule auto-expire only on first emit
        activeBroadcasts.set(data.broadcastId, broadcastPayload);
        setTimeout(() => activeBroadcasts.delete(data.broadcastId), 10 * 60 * 1000);
      } else {
        console.log(`[socket] re-broadcast: ${data.broadcastId} (age: ${Math.floor((Date.now() - broadcastPayload.createdAt) / 1000)}s)`);
      }

      // Check TTL before re-broadcasting (120s = popup lifetime)
      const POPUP_TTL_MS = 120 * 1000;
      if (!isNew && (Date.now() - broadcastPayload.createdAt) > POPUP_TTL_MS) {
        console.log(`[socket] broadcast expired, skipping re-emit: ${data.broadcastId}`);
        return;
      }

      // Emit to service room + all providers room on every call
      // Chaining .to() ensures socket.io deduplicates if a provider is in both rooms
      const roomName = `service:${data.serviceId}`;
      io.to(roomName).to('providers').emit('incoming_broadcast', broadcastPayload);
      console.log(`[socket] broadcast sent to ${roomName} + providers room (isNew=${isNew})`);
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
          customerPhone: data.customerPhone || null,
          address,
          lat: data.lat ?? broadcast?.lat ?? null,
          lng: data.lng ?? broadcast?.lng ?? null,
          price: data.price || 0,
          scheduled_at: data.scheduled_at || data.scheduledAt || new Date().toISOString(),
          status: 'assigned',
          notes: broadcast?.notes || '',
          voiceNote: broadcast?.voiceNote || false,
          voiceNoteUrl: broadcast?.voiceNoteUrl || null,
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
        providerPhone: data.providerPhone,
        price: data.price,
        rating: data.rating,
        distanceKm: data.distanceKm,
        etaMin: data.etaMin,
        reviews: data.reviews,
        submittedAt: Date.now()
      });
    });

    // Chat real-time messaging sockets
    socket.on('join_chat_room', (data: { bookingId: string }) => {
      const room = `chat:${data.bookingId}`;
      socket.join(room);
      console.log(`[socket] Socket ${socket.id} joined chat room: ${room}`);
    });

    socket.on('send_chat_message', (data: { bookingId: string; text: string; senderId: string; senderRole: string; time: string; audioBase64?: string }) => {
      const room = `chat:${data.bookingId}`;
      console.log(`[socket] Chat message in room ${room} from ${data.senderId}`);

      let modifiedText = data.text;
      let violationDetected = false;

      // 1. Regex Masking (Prices and Phone Numbers)
      // Mask Phone Numbers (10 digits, optionally separated by spaces/dashes)
      const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
      if (phoneRegex.test(modifiedText)) {
        violationDetected = true;
        modifiedText = modifiedText.replace(phoneRegex, "[REDACTED NUMBER]");
      }

      // Mask Prices (e.g. ₹500, Rs 500, 500 Rs, $500)
      const priceRegex = /(?:₹|Rs\.?|\$)\s*\d+(?:,\d+)*(?:\.\d+)?|\d+(?:,\d+)*(?:\.\d+)?\s*(?:Rs\.?|rupees|bucks|inr)/gi;
      if (priceRegex.test(modifiedText)) {
        violationDetected = true;
        modifiedText = modifiedText.replace(priceRegex, "[REDACTED PRICE]");
      }

      // 2. Keyword Filtering
      const restrictedKeywords = ['cash', 'discount', 'gpay', 'phonepe', 'pay outside', 'cheap', 'direct', 'negotiate'];
      restrictedKeywords.forEach(keyword => {
        const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'gi');
        if (keywordRegex.test(modifiedText)) {
          violationDetected = true;
          modifiedText = modifiedText.replace(keywordRegex, "***");
        }
      });

      const messagePayload = { ...data, text: modifiedText };

      // Persist to Database asynchronously
      ChatModel.createMessage({
        booking_id: String(data.bookingId),
        sender_id: data.senderId,
        sender_role: data.senderRole,
        text: modifiedText,
        audio_base64: data.audioBase64
      }).then((dbMsg) => {
        const payloadWithDbId = { ...messagePayload, id: dbMsg.id, is_seen: false };
        // Relay the modified payload to all other users in the room
        socket.to(room).emit('chat_message_received', payloadWithDbId);
      }).catch(err => {
        console.error('[socket] Error saving chat message:', err);
        // Fallback to relay without DB ID if it fails
        socket.to(room).emit('chat_message_received', messagePayload);
      });

      // 3. System Warning Injection
      if (violationDetected) {
        const warningPayload = {
          bookingId: data.bookingId,
          text: "System Warning: Negotiating prices or sharing contact/payment details outside the app violates platform policy and may result in account suspension.",
          senderId: "system",
          senderRole: "system",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        // Emit warning to both the sender and the receiver
        io.to(room).emit('chat_message_received', warningPayload);
      }
    });

    socket.on('typing_indicator', (data: { bookingId: string; senderId: string }) => {
      const room = `chat:${data.bookingId}`;
      socket.to(room).emit('typing_indicator', data);
    });

    socket.on('mark_messages_seen', async (data: { bookingId: string; recipientId: string }) => {
      const room = `chat:${data.bookingId}`;
      try {
        await ChatModel.markMessagesAsSeen(String(data.bookingId), data.recipientId);
        // Notify the room that messages were read
        socket.to(room).emit('message_seen', { bookingId: data.bookingId, seenBy: data.recipientId });
      } catch (err) {
        console.error('[socket] Error marking messages as seen:', err);
      }
    });

    socket.on('provider_location_update', (data: { jobId: string; lat: number; lng: number }) => {
      const room = `job:${data.jobId}`;
      socket.to(room).emit('provider_location_update', { lat: data.lat, lng: data.lng });
    });

    socket.on('update_job_status', async (data: any) => {
      console.log(`[socket] update_job_status for booking ${data.bookingId} to ${data.status}`);
      
      // Persist to DB
      const dbId = String(data.bookingId).replace('req-', '');
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
      
      const userId = socket.data.userId;
      if (userId) {
        const userSockets = onlineUserConnections.get(userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            onlineUserConnections.delete(userId);
            broadcastStatus(userId, false); // Last connection closed
          }
        }
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
