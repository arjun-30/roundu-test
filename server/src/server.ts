/// <reference path="./types/express.d.ts" />
import http from 'http';
import { Server } from 'socket.io';
import { env } from './config/env';
import { getPool, closePool } from './config/database';
import { createApp } from './app';
import { ChatModel } from './models/chat.model';
import { ProviderModel, mapProvider, matchesServiceCategory } from './models/provider.model';
import { isProviderBusy, checkScheduleConflict, parseDateTime } from './utils/bookingHelper';
import { logProviderDecision } from './utils/logger';

async function main() {
  console.log(`[server] Starting RoundU backend on port ${process.env.PORT || 5000}...`);
  const db = getPool();
  try {
    // ── Column migrations ───────────────────────────────────────────────────
    // Create bookings table if it doesn't exist
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS bookings (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          customer_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          provider_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          service_id      VARCHAR(255),
          status          VARCHAR(50) NOT NULL DEFAULT 'pending',
          scheduled_at    TIMESTAMPTZ,
          address         TEXT,
          lat             NUMERIC(10, 7),
          lng             NUMERIC(10, 7),
          price           NUMERIC(10, 2),
          notes           TEXT,
          voice_note      BOOLEAN DEFAULT FALSE,
          voice_note_url  VARCHAR(500),
          paid            BOOLEAN DEFAULT FALSE,
          created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      console.log('[server] Bookings table ready');
    } catch (tableErr: any) {
      console.log('[server] Bookings table creation note:', tableErr.message);
      // Table might already exist, continue anyway
    }
    
    await db.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS voice_note BOOLEAN DEFAULT false;');
    await db.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS voice_note_url TEXT;');
    await db.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 2;');
    await db.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';");


    // Add location storage columns to users and providers tables
    await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS lat NUMERIC(10, 7);');
    await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS lng NUMERIC(10, 7);');
    await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS display_location VARCHAR(255);');

    await db.query('ALTER TABLE providers ADD COLUMN IF NOT EXISTS lat NUMERIC(10, 7);');
    await db.query('ALTER TABLE providers ADD COLUMN IF NOT EXISTS lng NUMERIC(10, 7);');
    await db.query('ALTER TABLE providers ADD COLUMN IF NOT EXISTS display_location VARCHAR(255);');

    // Set service_radius default to 20
    await db.query('ALTER TABLE providers ALTER COLUMN service_radius SET DEFAULT 20;');
    await db.query('UPDATE providers SET service_radius = 20 WHERE service_radius = 5 OR service_radius IS NULL;');

    // Add service_category column to providers table
    await db.query("ALTER TABLE providers ADD COLUMN IF NOT EXISTS service_category VARCHAR(255)[] DEFAULT '{}';");
    await db.query(`
      UPDATE providers p
      SET service_category = COALESCE(
        (
          SELECT array_agg(s.label)
          FROM provider_services ps
          JOIN services s ON ps.service_id = s.id
          WHERE ps.provider_id = p.id
        ),
        '{}'::VARCHAR[]
      )
      WHERE service_category IS NULL OR service_category = '{}';
    `);

    // ── Wallets table (needed by WalletModel / provider dashboard) ──────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS wallets (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        balance     BIGINT NOT NULL DEFAULT 0,
        currency    VARCHAR(8) NOT NULL DEFAULT 'INR',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);`);

    // ── Ensure all services used by the app exist in the services table ────
    await db.query(`
      INSERT INTO services (id, label, description, price_per_hr) VALUES
        ('plumber',                'Plumber',         'Pipes & drainage',            299),
        ('electrician',            'Electrician',      'Wiring & fixtures',           299),
        ('carwash',                'Car Wash',         'At your doorstep',            199),
        ('drivers',                'Acting Drivers',   'Expert chauffeurs',           399),
        ('housekeeping',           'House Keeping',    'Deep & regular',              499),
        ('ac-cleaning',            'AC Cleaning',      'AC service & filter clean',   499),
        ('ac-repair',              'AC Repair',        'AC diagnosis & repair',       599),
        ('appliance-repair',       'Appliance Repair', 'Home appliance repair',       399),
        ('pest-control',           'Pest Control',     'Home pest treatment',         699),
        ('painting',               'Painting',         'Home & office painting',      499),
        ('carpentry',              'Carpentry',        'Furniture & woodwork',        399),
        ('srv-d7orcli8qa3s738r9qe0','Expert Services', 'Premium customized services', 599)
      ON CONFLICT (id) DO NOTHING;
    `);

    // ── Provider approval status & blocking ────────────────────────────────
    await db.query(`ALTER TABLE providers ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending';`);
    await db.query(`ALTER TABLE providers ADD COLUMN IF NOT EXISTS rejection_reason TEXT;`);
    await db.query(`ALTER TABLE providers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;`);
    // Back-fill: already-verified providers get approved status
    await db.query(`UPDATE providers SET approval_status = 'approved', is_active = true WHERE is_verified = true AND approval_status = 'pending';`);

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
      socket.data.lat = data.lat != null ? Number(data.lat) : null;
      socket.data.lng = data.lng != null ? Number(data.lng) : null;
      socket.data.displayLocation = data.displayLocation || null;

      // Persist coordinates to database on registration/connect
      if (data.userId && data.lat != null && data.lng != null) {
        try {
          const { UserModel } = require('./models/user.model');
          await UserModel.update(data.userId, {
            lat: Number(data.lat),
            lng: Number(data.lng),
            display_location: data.displayLocation || null
          });
          console.log(`[socket] saved location coordinates for user ${data.userId} on registration`);
        } catch (err) {
          console.error(`[socket] failed to save location for user ${data.userId}:`, err);
        }
      }

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

        if (data.userId) {
          try {
            const { getPool } = require('./config/database');
            await getPool().query('UPDATE providers SET is_online = true WHERE user_id = $1', [data.userId]);
            console.log(`[socket] provider ${data.userId} marked online in DB on register`);
          } catch (err) {
            console.error('[socket] failed to set provider online on register:', err);
          }
        }

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
              console.log(`[socket] skipping expired broadcast ${id} (age: ${Math.floor(age / 1000)}s) for provider ${data.userId}`);
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

    socket.on('toggle_online', async (data: { userId: string; isOnline: boolean }) => {
      try {
        const { getPool } = require('./config/database');
        await getPool().query('UPDATE providers SET is_online = $1 WHERE user_id = $2', [data.isOnline, data.userId]);
        console.log(`[socket] updated provider ${data.userId} is_online to ${data.isOnline} in DB`);
        broadcastStatus(data.userId, data.isOnline);
      } catch (err) {
        console.error('[socket] failed to toggle provider online status in DB:', err);
      }
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
          try {
            const { getPool } = require('./config/database');
            const pRes = await getPool().query(
              'SELECT p.*, u.name, u.phone, u.avatar_url FROM providers p JOIN users u ON p.user_id = u.id WHERE p.user_id = $1',
              [target.data.userId]
            );
            const providerRow = pRes.rows[0];
            if (providerRow) {
              const provider = mapProvider(providerRow);
              // Get service label
              const sRes = await getPool().query('SELECT label FROM services WHERE id = $1', [data.serviceId]);
              const serviceLabel = sRes.rows[0]?.label || data.serviceId;

              // Calculate distance
              let dist = 0;
              if (data.lat != null && data.lng != null && provider.latitude != null && provider.longitude != null) {
                const { getDistanceKm } = require('./utils/locationHelper');
                dist = getDistanceKm({ lat: Number(data.lat), lng: Number(data.lng) }, { lat: provider.latitude, lng: provider.longitude });
              }

              const isOnline = provider.isOnline === true;
              const isApproved = providerRow.is_verified === true && providerRow.is_active !== false && providerRow.approval_status !== 'rejected';
              const matchesCategory = matchesServiceCategory(provider.serviceCategory, data.serviceId) ||
                                      matchesServiceCategory(provider.serviceCategory, serviceLabel);
              const inRadius = dist <= (provider.serviceRadius || 20);

              let decision = "ACCEPTED";
              if (!isOnline) {
                decision = "REJECTED (Offline)";
              } else if (!isApproved) {
                decision = "REJECTED (Unverified)";
              } else if (!matchesCategory) {
                decision = "REJECTED (Category mismatch)";
              } else if (!inRadius) {
                decision = "REJECTED (Outside radius)";
              }

              logProviderDecision({
                requestedCategory: serviceLabel,
                providerId: provider.id,
                providerName: providerRow.name || "Unknown",
                providerCategories: provider.serviceCategory || [],
                onlineStatus: isOnline,
                distance: dist,
                verificationStatus: isApproved,
                decision
              });

              if (isOnline && isApproved && matchesCategory && inRadius) {
                target.emit('incoming_request', payload);
                console.log(`[socket] direct request sent to provider ${data.providerId}`);
              }
            }
          } catch (err) {
            console.error('[socket] error validating direct request provider:', err);
          }
          return;
        }
      }

      // 2. Room-based Broadcast
      const roomName = `service:${data.serviceId}`;
      console.log(`[socket] broadcasting request to room: ${roomName} filtered by radius`);
      const targetSockets = await io.in(roomName).fetchSockets();
      for (const s of targetSockets) {
        try {
          const { getPool } = require('./config/database');
          const pRes = await getPool().query(
            'SELECT p.*, u.name, u.phone, u.avatar_url FROM providers p JOIN users u ON p.user_id = u.id WHERE p.user_id = $1',
            [s.data.userId]
          );
          const providerRow = pRes.rows[0];
          if (!providerRow) continue;

          const provider = mapProvider(providerRow);
          // Get service label
          const sRes = await getPool().query('SELECT label FROM services WHERE id = $1', [data.serviceId]);
          const serviceLabel = sRes.rows[0]?.label || data.serviceId;

          // Calculate distance
          let dist = 0;
          if (data.lat != null && data.lng != null && provider.latitude != null && provider.longitude != null) {
            const { getDistanceKm } = require('./utils/locationHelper');
            dist = getDistanceKm({ lat: Number(data.lat), lng: Number(data.lng) }, { lat: provider.latitude, lng: provider.longitude });
          }

          const isOnline = provider.isOnline === true;
          const isApproved = providerRow.is_verified === true && providerRow.is_active !== false && providerRow.approval_status !== 'rejected';
          const matchesCategory = matchesServiceCategory(provider.serviceCategory, data.serviceId) ||
                                  matchesServiceCategory(provider.serviceCategory, serviceLabel);
          const inRadius = dist <= (provider.serviceRadius || 20);

          let decision = "ACCEPTED";
          if (!isOnline) {
            decision = "REJECTED (Offline)";
          } else if (!isApproved) {
            decision = "REJECTED (Unverified/Blocked)";
          } else if (!matchesCategory) {
            decision = "REJECTED (Category mismatch)";
          } else if (!inRadius) {
            decision = "REJECTED (Outside radius)";
          }

          logProviderDecision({
            requestedCategory: serviceLabel,
            providerId: provider.id,
            providerName: providerRow.name || "Unknown",
            providerCategories: provider.serviceCategory || [],
            onlineStatus: isOnline,
            distance: dist,
            verificationStatus: isApproved,
            decision
          });

          if (isOnline && isApproved && matchesCategory && inRadius) {
            s.emit('incoming_request', payload);
            console.log(`[socket] request sent to provider ${s.data.userId}`);
          }
        } catch (err) {
          console.error('[socket] error validating room broadcast provider:', err);
        }
      }
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

      // Emit to service room + all providers room filtered by matching radius
      const roomName = `service:${data.serviceId}`;
      console.log(`[socket] broadcasting job to room: ${roomName} + providers filtered by radius`);
      
      const broadcastAndFilter = async () => {
        try {
          const targetSockets = await io.in(roomName).in('providers').fetchSockets();
          
          // Deduplicate sockets in case a socket is in both rooms
          const uniqueSockets = Array.from(new Map(targetSockets.map((s: any) => [s.id, s])).values());

          for (const s of uniqueSockets) {
            // Skip the customer themselves
            if (s.data.userId === data.customerId) continue;

            try {
              const { getPool } = require('./config/database');
              const pRes = await getPool().query(
                'SELECT p.*, u.name, u.phone, u.avatar_url FROM providers p JOIN users u ON p.user_id = u.id WHERE p.user_id = $1',
                [s.data.userId]
              );
              const providerRow = pRes.rows[0];
              if (!providerRow) continue;

              const provider = mapProvider(providerRow);
              // Get service label
              const sRes = await getPool().query('SELECT label FROM services WHERE id = $1', [data.serviceId]);
              const serviceLabel = sRes.rows[0]?.label || data.serviceId;

              // Calculate distance
              let dist = 0;
              if (data.lat != null && data.lng != null && provider.latitude != null && provider.longitude != null) {
                const { getDistanceKm } = require('./utils/locationHelper');
                dist = getDistanceKm({ lat: Number(data.lat), lng: Number(data.lng) }, { lat: provider.latitude, lng: provider.longitude });
              }

              const isOnline = provider.isOnline === true;
              const isApproved = providerRow.is_verified === true && providerRow.is_active !== false && providerRow.approval_status !== 'rejected';
              const matchesCategory = matchesServiceCategory(provider.serviceCategory, data.serviceId) ||
                                      matchesServiceCategory(provider.serviceCategory, serviceLabel);
              const inRadius = dist <= (provider.serviceRadius || 20);

              let decision = "ACCEPTED";
              if (!isOnline) {
                decision = "REJECTED (Offline)";
              } else if (!isApproved) {
                decision = "REJECTED (Unverified)";
              } else if (!matchesCategory) {
                decision = "REJECTED (Category mismatch)";
              } else if (!inRadius) {
                decision = "REJECTED (Outside radius)";
              }

              logProviderDecision({
                requestedCategory: serviceLabel,
                providerId: provider.id,
                providerName: providerRow.name || "Unknown",
                providerCategories: provider.serviceCategory || [],
                onlineStatus: isOnline,
                distance: dist,
                verificationStatus: isApproved,
                decision
              });

              if (isOnline && isApproved && matchesCategory && inRadius) {
                s.emit('incoming_broadcast', broadcastPayload);
                console.log(`[socket] job broadcast sent to provider ${s.data.userId}`);
              }
            } catch (err) {
              console.error('[socket] error validating job broadcast provider:', err);
            }
          }
        } catch (err) {
          console.error('[socket] error in broadcast_job filtering:', err);
        }
      };
      
      broadcastAndFilter();
    });

    socket.on('accept_quote', (data: any) => {
      console.log(`[socket] accept_quote for ${data.broadcastId} by ${data.acceptedProviderId}, bookingId=${data.bookingId}`);

      const broadcast = activeBroadcasts.get(data.broadcastId);
      const serviceId = data.serviceId || broadcast?.serviceId;
      const customerName = data.customerName || broadcast?.customerName || 'Customer';
      const address = data.address || broadcast?.address || '';

      if (broadcast || data.bookingId) {
        // Notify other providers in the service room and providers room the job is taken
        if (serviceId) {
          io.to(`service:${serviceId}`).to('providers').emit('job_taken', {
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

    socket.on('submit_quote', async (data: any) => {
      console.log(`[socket] submit_quote for ${data.broadcastId} from provider ${data.providerId}`);

      try {
        const provider = await ProviderModel.findByUserId(data.providerId);
        const providerId = provider ? provider.id : data.providerId;

        const broadcast = activeBroadcasts.get(data.broadcastId);

        // Check if provider has any active jobs
        const { getProviderActiveBookings } = require('./utils/bookingHelper');
        const activeBookings = await getProviderActiveBookings(providerId);
        
        if (activeBookings && activeBookings.length > 0) {
          socket.emit('quote_error', {
            message: 'You cannot send quotes while you have an active job. Please complete your current job first.'
          });
          return;
        }

        const proposedStart = parseDateTime(
          broadcast?.date,
          broadcast?.time
        );

        const hoursFromNow =
          (proposedStart.getTime() - Date.now()) /
          (1000 * 60 * 60);

        const isBusy = await isProviderBusy(providerId);

        // Provider is active
        if (isBusy) {

          // Allow scheduled jobs only if 6+ hours away
          if (hoursFromNow < 6) {
            socket.emit('quote_error', {
              message:
                'Finish your current job before accepting another immediate booking.'
            });
            return;
          }
        }

        // Check schedule conflicts
        if (broadcast) {

          const proposedDuration =
            broadcast.duration || 2;

          const conflictCheck =
            await checkScheduleConflict(
              providerId,
              proposedStart,
              proposedDuration
            );

          if (conflictCheck.conflict) {
            socket.emit('quote_error', {
              message:
                conflictCheck.message ||
                'Schedule conflict: You have another booking that overlaps with this request.'
            });
            return;
          }
        }
        const customerId = data.customerId || broadcast?.customerId;

        if (customerId) {
          io.to(`user:${customerId}`).emit('new_quote_received', {
            broadcastId: data.broadcastId,
            serviceId: broadcast?.serviceId || data.serviceId,
            providerId: providerId,
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
          console.log(`[socket] new_quote_received sent to customer user:${customerId}`);
        } else {
          console.warn(`[socket] submit_quote: no customerId found for broadcast ${data.broadcastId}`);
        }

        socket.emit('quote_sent_confirmation', {
          broadcastId: data.broadcastId,
          price: data.price,
          serviceId: broadcast?.serviceId || data.serviceId,
          submittedAt: Date.now()
        });
      } catch (err) {
        console.error('[socket] error handling submit_quote:', err);
        socket.emit('quote_error', {
          message: 'An error occurred while processing your quote.'
        });
      }
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

    socket.on('provider_location_update', async (data: { jobId: string; lat: number; lng: number }) => {
      const room = `job:${data.jobId}`;
      socket.to(room).emit('provider_location_update', { lat: data.lat, lng: data.lng });

      const userId = socket.data.userId;
      if (userId && data.lat != null && data.lng != null) {
        try {
          socket.data.lat = Number(data.lat);
          socket.data.lng = Number(data.lng);
          const { UserModel } = require('./models/user.model');
          await UserModel.update(userId, {
            lat: Number(data.lat),
            lng: Number(data.lng)
          });
        } catch (err) {
          console.error('[socket] failed to update coordinates in database during tracking:', err);
        }
      }
    });

    socket.on('update_job_status', async (data: any) => {
      console.log(`[socket] update_job_status for booking ${data.bookingId} to ${data.status}, paid=${data.paid}`);

      // Persist to DB
      const dbId = String(data.bookingId).replace('req-', '');
      try {
        const { BookingModel } = require('./models/booking.model');
        await BookingModel.updateBooking(dbId, {
          status: data.status,
          paid: data.paid
        });
      } catch (err) {
        console.error('[socket] Failed to update booking in DB:', err);
      }

      io.emit('job_status_updated', {
        bookingId: data.bookingId,
        status: data.status,
        paid: data.paid,
        quote: data.quote || null,
        timestamp: Date.now()
      });
    });

    socket.on('disconnect', async () => {
      if (env.isDevelopment) {
        console.log(`[socket] client disconnected: ${socket.id}`);
      }

      const userId = socket.data.userId;
      const role = socket.data.role;
      if (userId) {
        const userSockets = onlineUserConnections.get(userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            onlineUserConnections.delete(userId);
            broadcastStatus(userId, false); // Last connection closed
            if (role === 'provider') {
              try {
                const { getPool } = require('./config/database');
                await getPool().query('UPDATE providers SET is_online = false WHERE user_id = $1', [userId]);
                console.log(`[socket] provider ${userId} went offline in DB due to disconnect`);
              } catch (err) {
                console.error('[socket] failed to set provider offline on disconnect:', err);
              }
            }
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
