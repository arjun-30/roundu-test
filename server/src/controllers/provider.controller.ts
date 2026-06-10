import { Request, Response } from 'express';
import { env } from '../config/env';
import { ProviderModel } from '../models/provider.model';
import { getPool } from '../config/database';
import { WalletModel } from '../models/wallet.model';
import { isProviderBusy } from '../utils/bookingHelper';

export const getProviderDashboard = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query; // In real app, this comes from JWT
    if (!userId) return res.status(400).json({ success: false, message: 'User ID required' });

    let provider = null;
    try {
      provider = await ProviderModel.findByUserId(userId as string);
    } catch (err: any) {
      // Handle cases where client passed a phone number instead of UUID
      if ((err?.message || '').includes('invalid input syntax for type uuid')) {
        const pool = getPool();
        const userRes = await pool.query('SELECT id FROM users WHERE phone = $1', [userId]);
        if (userRes.rows[0]) {
          const resolvedUserId = userRes.rows[0].id;
          provider = await ProviderModel.findByUserId(resolvedUserId);
        }
      } else {
        throw err;
      }
    }
    if (!provider) return res.status(404).json({ success: false, message: 'Provider profile not found' });

    const stats = await ProviderModel.getStats(provider.id);
    
    const walletModel = new WalletModel(getPool());
    const wallet = await walletModel.findOrCreate(userId as string);

    res.json({
      success: true,
      data: {
        provider,
        stats,
        wallet: {
          balance: wallet.balance / 100, // Convert paise to rupees
          currency: wallet.currency
        }
      }
    });
  } catch (error: any) {
    console.error('Provider dashboard error:', error?.stack || error);
    const resp: any = { success: false, message: 'Server error' };
    if (env.isDevelopment) {
      resp.error = {
        message: error?.message,
        stack: error?.stack
      };
    }
    res.status(500).json(resp);
  }
};

export const searchProviders = async (req: Request, res: Response) => {
  try {
    const { serviceId, lat, lng, userId } = req.query;

    let customerLat = lat ? Number(lat) : null;
    let customerLng = lng ? Number(lng) : null;

    // Fallback: If no lat/lng passed in query, try to get from database using userId
    if ((customerLat == null || customerLng == null) && userId) {
      try {
        const pool = getPool();
        const userRes = await pool.query('SELECT lat, lng FROM users WHERE id = $1', [userId]);
        if (userRes.rows[0]) {
          customerLat = userRes.rows[0].lat ? Number(userRes.rows[0].lat) : null;
          customerLng = userRes.rows[0].lng ? Number(userRes.rows[0].lng) : null;
        }
      } catch (err) {
        console.error('Failed to get customer coordinates from database:', err);
      }
    }

    let providers;
    if (serviceId) {
      providers = await ProviderModel.findByServiceId(serviceId as string);
    } else {
      // No serviceId — return all online providers (for Nearby Professionals)
      providers = await ProviderModel.findAllOnline();
    }
    
    const filteredProviders = [];
    for (const p of providers) {
      const busy = await isProviderBusy(p.id);
      if (busy) continue;

      // Enforce that candidate providers are online, verified, active and not rejected
      if (!p.is_online || !p.is_verified || p.is_active === false || p.approval_status === 'rejected') {
        continue;
      }

      // Filter by distance if customer coordinates are available
      if (customerLat != null && customerLng != null) {
        let plat = p.lat ? Number(p.lat) : null;
        let plng = p.lng ? Number(p.lng) : null;

        // Fallback: Check user table if not on provider profile
        if (plat == null || plng == null) {
          try {
            const pool = getPool();
            const userRes = await pool.query('SELECT lat, lng FROM users WHERE id = $1', [p.user_id]);
            if (userRes.rows[0]) {
              plat = userRes.rows[0].lat ? Number(userRes.rows[0].lat) : null;
              plng = userRes.rows[0].lng ? Number(userRes.rows[0].lng) : null;
            }
          } catch (_) {}
        }

        if (plat != null && plng != null) {
          const { getDistanceKm } = require('../utils/locationHelper');
          const dist = getDistanceKm(
            { lat: customerLat, lng: customerLng },
            { lat: plat, lng: plng }
          );

          const maxRadius = p.service_radius || 20;
          if (dist > maxRadius) {
            console.log(`[Search] Provider ${p.id} filtered out (distance ${dist.toFixed(2)} km > service radius ${maxRadius} km)`);
            continue; // Skip provider because they are outside of the service radius
          }
          // Enrich with calculated distance
          p.distanceKm = Math.round(dist * 10) / 10;
        }
      }

      filteredProviders.push(p);
    }

    res.json({ success: true, data: filteredProviders });
  } catch (error) {
    console.error('Search providers error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const registerProvider = async (req: Request, res: Response) => {
  try {
    const { userId, bio, experienceYears, workingHours, serviceRadius, serviceIds } = req.body;
    
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const provider = await ProviderModel.register(userId, {
      bio: bio || '',
      experienceYears: experienceYears || 1,
      workingHours: workingHours || '9 AM - 6 PM',
      serviceRadius: serviceRadius || 5,
      serviceIds
    });

    res.status(201).json({ success: true, data: provider, message: 'Provider registered successfully' });
  } catch (error) {
    console.error('Register provider error:', error);
    res.status(500).json({ success: false, message: 'Failed to register provider' });
  }
};

export const updateServiceRadius = async (req: Request, res: Response) => {
  try {
    const { userId, serviceRadius } = req.body;
    if (!userId || serviceRadius === undefined) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const success = await ProviderModel.updateServiceRadiusByUserId(userId, Number(serviceRadius));
    if (!success) {
      return res.status(404).json({ success: false, message: 'Provider profile not found' });
    }

    res.json({ success: true, message: 'Service radius updated' });
  } catch (error) {
    console.error('Update service radius error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
export const updateWorkingHours = async (req: Request, res: Response) => {
  try {
    const { userId, workingHours } = req.body;
    if (!userId || workingHours === undefined) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const success = await ProviderModel.updateWorkingHoursByUserId(userId, workingHours);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Provider profile not found' });
    }

    res.json({ success: true, message: 'Working hours updated' });
  } catch (error) {
    console.error('Update working hours error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const checkProviderExists = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      res.status(400).json({ success: false, message: 'User ID required' });
      return;
    }

    const provider = await ProviderModel.findByUserId(userId as string);
    res.json({ exists: !!provider });
  } catch (error) {
    console.error('Check provider exists error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getProviderProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'Provider ID required' });

    const provider = await ProviderModel.findById(id);
    if (!provider) return res.status(404).json({ success: false, message: 'Provider not found' });

    const stats = await ProviderModel.getStats(provider.id);

    res.json({
      success: true,
      data: {
        provider: {
          id: provider.id,
          name: provider.name,
          phone: provider.phone,
          avatar: provider.avatar_url,
          bio: provider.bio,
          experience_years: provider.experience_years,
          is_online: provider.is_online,
          rating: parseFloat(provider.rating || '5.0'),
          serviceId: provider.service_id,
        },
        stats
      }
    });
  } catch (error) {
    console.error('Get provider profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
