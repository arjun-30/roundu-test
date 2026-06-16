import { Router, Request, Response } from 'express';
import { getProviderDashboard, searchProviders, registerProvider, updateServiceRadius, updateWorkingHours, checkProviderExists, getProviderProfile, updateVideoUrl } from '../controllers/provider.controller';
import { getPool } from '../config/database';

const router = Router();

router.get('/dashboard', getProviderDashboard);
router.get('/search', searchProviders);
router.post('/register', registerProvider);
router.post('/update-radius', updateServiceRadius);
router.post('/update-hours', updateWorkingHours);
router.post('/update-video', updateVideoUrl);
router.get('/exists', checkProviderExists);
router.get('/:id', getProviderProfile);

// Real-time count of providers actually connected via socket for a service room
router.get('/online-count', async (req: Request, res: Response) => {
  const { serviceId } = req.query;
  if (!serviceId) return res.json({ success: true, count: 0 });
  try {
    const io = req.app.locals.io;
    const sockets = await io.in(`service:${serviceId}`).fetchSockets();
    return res.json({ success: true, count: sockets.length });
  } catch (e: any) {
    return res.json({ success: true, count: 0 });
  }
});

// Temporary debug endpoint - check user/provider status
router.get('/debug-status', async (req: Request, res: Response) => {
  const { phone } = req.query;
  if (!phone) return res.json({ error: 'phone required' });
  try {
    const pool = getPool();
    const user = await pool.query(`SELECT id, phone, role, name FROM users WHERE phone = $1`, [phone]);
    if (!user.rows[0]) return res.json({ found: false, message: 'No user with this phone' });

    const userId = user.rows[0].id;
    const provider = await pool.query(`SELECT id, is_online FROM providers WHERE user_id = $1`, [userId]);
    const services = provider.rows[0]
      ? await pool.query(`SELECT service_id FROM provider_services WHERE provider_id = $1`, [provider.rows[0].id])
      : { rows: [] };

    res.json({
      user: user.rows[0],
      provider: provider.rows[0] || null,
      serviceIds: services.rows.map((r: any) => r.service_id),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
