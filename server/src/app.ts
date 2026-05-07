import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { Pool } from 'pg';
import { Server as SocketServer } from 'socket.io';
import { corsMiddleware } from './middleware/cors';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import apiRouter from './routes/index';
import { env } from './config/env';

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

  // app.use(helmet());
  app.use(corsMiddleware());
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.isProduction ? 'combined' : 'dev'));
  }

  app.get('/health', async (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'roundu-backend',
      env: env.NODE_ENV,
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
  app.get('/test-broadcast', (req: Request, res: Response) => {
    const serviceId = (req.query.serviceId as string) || 'plumber';
    if (!deps.io) return res.status(500).json({ error: 'io not initialized' });
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
    const connectedSockets = deps.io.sockets.sockets.size;
    deps.io.emit('incoming_broadcast', payload);
    console.log(`[test-broadcast] emitted to ${connectedSockets} sockets for service: ${serviceId}`);
    res.json({ success: true, payload, connectedSockets });
  });
  // ────────────────────────────────────────────────────────────────────────

  app.use('/api/v1', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
