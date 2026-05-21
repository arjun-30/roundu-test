import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { sendError } from '../utils/response';

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.header('authorization') ?? req.header('Authorization');
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    sendError(res, 401, 'UNAUTHENTICATED', 'Missing or malformed Authorization header');
    return;
  }
  const token = header.slice(7).trim();
  if (!token) {
    sendError(res, 401, 'UNAUTHENTICATED', 'Empty bearer token');
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    if (!payload.sub || !payload.role) {
      sendError(res, 401, 'UNAUTHENTICATED', 'Token payload missing required claims');
      return;
    }

    // Single-device session enforcement
    // Check if the token version matches the DB version
    const { getPool } = require('../config/database');
    getPool().query('SELECT session_version FROM users WHERE id = $1', [payload.sub])
      .then((dbRes: any) => {
        const userRow = dbRes.rows[0];
        if (!userRow) {
          sendError(res, 401, 'UNAUTHENTICATED', 'User not found');
          return;
        }
        const dbVersion = userRow.session_version || 1;
        const tokenVersion = payload.v || 1;
        if (dbVersion !== tokenVersion) {
          sendError(res, 401, 'SESSION_EXPIRED', 'Session expired. Logged in from another device.');
          return;
        }

        req.user = {
          sub: payload.sub,
          id: payload.sub,
          role: payload.role,
          phone: payload.phone,
        };
        next();
      })
      .catch((err: any) => {
        console.error('[auth] DB error during session check:', err);
        sendError(res, 500, 'SERVER_ERROR', 'Failed to authenticate');
      });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid token';
    sendError(res, 401, 'UNAUTHENTICATED', message);
  }
}
