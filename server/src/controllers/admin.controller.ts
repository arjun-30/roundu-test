import { Request, Response } from 'express';
import { getPool } from '../config/database';

const ADMIN_NOTIFICATION_TYPES = [
  'provider_registration',
  'provider_approved',
  'provider_rejected',
  'booking_cancelled',
  'refund_requested',
];

/**
 * GET /api/admin/providers
 * Returns all providers joined with user data and service labels.
 * Bypasses Supabase RLS by using direct PostgreSQL connection.
 */
export async function listProviders(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { rows } = await pool.query(`
      SELECT
        p.id,
        p.user_id,
        p.bio,
        p.experience_years,
        p.working_hours,
        p.service_radius,
        p.is_verified,
        p.is_online,
        p.is_active,
        p.approval_status,
        p.rejection_reason,
        p.rating,
        p.created_at,
        u.name,
        u.email,
        u.phone,
        u.kyc_status,
        COALESCE(
          (
            SELECT json_agg(s.label ORDER BY s.label)
            FROM provider_services ps
            JOIN services s ON s.id = ps.service_id
            WHERE ps.provider_id = p.id
          ),
          '[]'::json
        ) AS service_labels
      FROM providers p
      JOIN users u ON u.id = p.user_id
      ORDER BY p.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err: any) {
    console.error('[AdminController] listProviders error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/admin/providers/:id/approve
 * Approves a provider by setting is_verified, approval_status, is_active.
 */
export async function approveProvider(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const pool = getPool();
    const result = await pool.query(
      `UPDATE providers
       SET is_verified = true,
           approval_status = 'approved',
           is_active = true,
           rejection_reason = NULL
       WHERE id = $1
       RETURNING id, user_id`,
      [id]
    );
    if ((result.rowCount ?? 0) === 0) {
      res.status(404).json({ success: false, error: 'Provider not found' });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error('[AdminController] approveProvider error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/admin/providers/:id/reject
 * Rejects a provider with a required reason.
 */
export async function rejectProvider(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { reason } = req.body as { reason?: string };
  try {
    const pool = getPool();
    const result = await pool.query(
      `UPDATE providers
       SET is_verified = false,
           approval_status = 'rejected',
           is_active = false,
           rejection_reason = $2
       WHERE id = $1
       RETURNING id`,
      [id, reason || null]
    );
    if ((result.rowCount ?? 0) === 0) {
      res.status(404).json({ success: false, error: 'Provider not found' });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error('[AdminController] rejectProvider error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/admin/notifications
 * Returns admin-facing notifications ordered by newest.
 */
export async function listAdminNotifications(req: Request, res: Response): Promise<void> {
  const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10) || 20, 100);
  try {
    const pool = getPool();
    const placeholders = ADMIN_NOTIFICATION_TYPES.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await pool.query(
      `SELECT id, user_id, title, message, type, is_read, data, created_at
       FROM notifications
       WHERE type IN (${placeholders})
       ORDER BY created_at DESC
       LIMIT $${ADMIN_NOTIFICATION_TYPES.length + 1}`,
      [...ADMIN_NOTIFICATION_TYPES, limit]
    );
    res.json({ success: true, data: rows });
  } catch (err: any) {
    console.error('[AdminController] listAdminNotifications error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/admin/notifications
 * Creates an admin notification (called by provider registration flow).
 */
export async function createAdminNotification(req: Request, res: Response): Promise<void> {
  const { title, message, type, data } = req.body as {
    title?: string;
    message?: string;
    type?: string;
    data?: Record<string, unknown>;
  };
  if (!title || !message || !type) {
    res.status(400).json({ success: false, error: 'title, message and type are required' });
    return;
  }
  try {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, data, is_read)
       VALUES (NULL, $1, $2, $3, $4::jsonb, false)
       RETURNING id`,
      [title, message, type, JSON.stringify(data ?? {})]
    );
    res.json({ success: true, id: result.rows[0]?.id });
  } catch (err: any) {
    console.error('[AdminController] createAdminNotification error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * PATCH /api/admin/notifications/mark-all-read
 * Marks all admin notifications as read.
 */
export async function markAllAdminNotificationsRead(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const placeholders = ADMIN_NOTIFICATION_TYPES.map((_, i) => `$${i + 1}`).join(', ');
    await pool.query(
      `UPDATE notifications SET is_read = true
       WHERE type IN (${placeholders}) AND is_read = false`,
      ADMIN_NOTIFICATION_TYPES
    );
    res.json({ success: true });
  } catch (err: any) {
    console.error('[AdminController] markAllAdminNotificationsRead error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * PATCH /api/admin/notifications/:id/read
 * Marks a single notification as read.
 */
export async function markNotificationRead(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const pool = getPool();
    await pool.query('UPDATE notifications SET is_read = true WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err: any) {
    console.error('[AdminController] markNotificationRead error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}
