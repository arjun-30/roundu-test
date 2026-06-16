import express from 'express';
import type { Application, Request, Response } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { Pool } from 'pg';
import { Server as SocketServer } from 'socket.io';
import path from 'path';
import { corsMiddleware } from './middleware/cors';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import apiRouter from './routes/index';
import { env as configEnv } from './config/env';

export interface AppDeps {
  db: Pool;
  io?: SocketServer;
}

export function createApp(deps: AppDeps): Application {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.locals.db = deps.db;
  if (deps.io) app.locals.io = deps.io;

  // Serve uploads statically
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  // app.use(helmet());
  app.use(corsMiddleware());
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  if (configEnv.NODE_ENV !== 'test') {
    app.use(morgan(configEnv.isProduction ? 'combined' : 'dev'));
  }

  app.get('/health', async (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'roundu-backend',
      env: configEnv.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/health/db', async (_req: Request, res: Response) => {
    try {
      const result = await deps.db.query('SELECT 1 AS ok');
      res.status(200).json({ status: 'ok', db: result.rows[0]?.ok === 1 });
    } catch (err) {
      res.status(503).json({
        status: 'error',
        db: false,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // ── TEMP DEBUG: trigger a broadcast directly via HTTP ──────────────────
  app.get('/api/test-broadcast', (req: Request, res: Response) => {
    const serviceId = (req.query.serviceId as string) || 'plumber';
    const io = req.app.locals.io || deps.io;
    if (!io) return res.status(500).json({ error: 'io not initialized' });
    const payload = {
      broadcastId: `test-${Date.now()}`,
      customerId: 'test-customer',
      customerName: 'Test Customer',
      serviceId,
      address: '123 Test Street, Chennai',
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      notes: 'This is a test broadcast from the server.',
      status: 'active',
      createdAt: Date.now(),
    };
    const connectedSockets = io.sockets.sockets.size;
    io.emit('incoming_broadcast', payload);
    console.log(`[test-broadcast] emitted to ${connectedSockets} sockets for service: ${serviceId}`);
    res.json({ success: true, payload, connectedSockets });
  });
  // ────────────────────────────────────────────────────────────────────────

  // ── TEMP DEBUG: database inspector ──────────────────────────────────────
  app.get('/api/debug-db', async (req: Request, res: Response) => {
    try {
      const users = await deps.db.query('SELECT id, name, phone, role, lat, lng, display_location FROM users');
      const providers = await deps.db.query('SELECT id, user_id, bio, experience_years, rating, response_rate, is_online, service_radius, working_hours, is_verified, lat, lng, display_location, service_category, approval_status, rejection_reason, is_active FROM providers');
      const provider_services = await deps.db.query('SELECT * FROM provider_services');
      res.json({
        success: true,
        users: users.rows,
        providers: providers.rows,
        provider_services: provider_services.rows
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  // ────────────────────────────────────────────────────────────────────────

  app.get('/api/fix-radius', async (_req: Request, res: Response) => {
    try {
      const constraints = await deps.db.query(`
        SELECT conname, pg_get_constraintdef(c.oid) 
        FROM pg_constraint c 
        JOIN pg_namespace n ON n.oid = c.connamespace 
        WHERE n.nspname = 'public' AND c.conrelid = 'providers'::regclass;
      `);
      
      const constraint = constraints.rows.find((r: any) => r.pg_get_constraintdef.includes('service_radius'));
      
      if (constraint) {
        await deps.db.query(`ALTER TABLE providers DROP CONSTRAINT ${constraint.conname}`);
        res.json({ success: true, message: `Dropped constraint ${constraint.conname}` });
      } else {
        res.json({ success: true, message: 'No constraint found on service_radius' });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.use('/api', apiRouter);
  app.use('/api/v1', apiRouter);

  app.get('/version', (_req: Request, res: Response) => {
    res.json({ version: 'v2.1-harmonized', ts: Date.now() });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
