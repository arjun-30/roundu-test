import { Router, Request, Response, NextFunction } from 'express';
import {
  listProviders,
  approveProvider,
  rejectProvider,
  listAdminNotifications,
  createAdminNotification,
  markAllAdminNotificationsRead,
  markNotificationRead,
} from '../controllers/admin.controller';

const router = Router();

// Simple shared-secret guard — the admin dashboard sends the stored admin token
// as the x-admin-key header. Never uses Supabase RLS or JWT.
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'rdu-admin-2025';

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers['x-admin-key'];
  if (!key || key !== ADMIN_SECRET) {
    res.status(403).json({ success: false, error: 'Forbidden' });
    return;
  }
  next();
}

router.use(requireAdmin);

// Provider approval management
router.get('/providers', listProviders);
router.post('/providers/:id/approve', approveProvider);
router.post('/providers/:id/reject', rejectProvider);

// Admin notification management
// mark-all-read must come before /:id/read to avoid route shadowing
router.patch('/notifications/mark-all-read', markAllAdminNotificationsRead);
router.get('/notifications', listAdminNotifications);
router.post('/notifications', createAdminNotification);
router.patch('/notifications/:id/read', markNotificationRead);

export default router;
