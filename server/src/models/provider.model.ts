import { getPool } from '../config/database';
import { isValidUuid } from '../utils/uuid';

export interface Provider {
  id: string;
  user_id: string;
  bio: string | null;
  experience_years: number;
  rating: number;
  response_rate: number;
  is_online: boolean;
  is_verified: boolean;
  is_active: boolean;
  approval_status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  service_radius: number;
  working_hours: string | null;
  lat?: number | null;
  lng?: number | null;
  display_location?: string | null;

  // camelCase fields for client matching & verification
  serviceCategory?: string[];
  isOnline?: boolean;
  serviceRadius?: number;
  latitude?: number | null;
  longitude?: number | null;
}

export function mapProvider(dbRow: any): any {
  if (!dbRow) return null;
  return {
    ...dbRow,
    id: dbRow.id,
    serviceCategory: dbRow.service_category || [],
    service_category: dbRow.service_category || [],
    isOnline: dbRow.is_online,
    is_online: dbRow.is_online ?? false,
    is_verified: dbRow.is_verified ?? false,
    is_active: dbRow.is_active ?? true,
    approval_status: dbRow.approval_status ?? 'pending',
    rejection_reason: dbRow.rejection_reason ?? null,
    serviceRadius: dbRow.service_radius,
    service_radius: dbRow.service_radius,
    latitude: dbRow.lat != null ? Number(dbRow.lat) : null,
    lat: dbRow.lat != null ? Number(dbRow.lat) : null,
    longitude: dbRow.lng != null ? Number(dbRow.lng) : null,
    lng: dbRow.lng != null ? Number(dbRow.lng) : null,
  };
}

export function matchesServiceCategory(providerCategory: any, requestedService: string): boolean {
  if (!providerCategory) return false;
  if (!requestedService) return false;

  const normalize = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const reqNorm = normalize(requestedService);

  if (Array.isArray(providerCategory)) {
    return providerCategory.some(cat => normalize(cat) === reqNorm);
  }
  if (typeof providerCategory === 'string') {
    return normalize(providerCategory) === reqNorm;
  }
  return false;
}

export const ProviderModel = {
  async findByUserId(userId: string): Promise<any | null> {
    if (!isValidUuid(userId)) return null;
    const res = await getPool().query('SELECT * FROM providers WHERE user_id = $1', [userId]);
    if (!res.rows[0]) return null;
    const provider = mapProvider(res.rows[0]);
    const sRes = await getPool().query('SELECT service_id FROM provider_services WHERE provider_id = $1', [provider.id]);
    provider.serviceIds = sRes.rows.map((r: any) => r.service_id);
    return provider;
  },

  async findById(providerId: string): Promise<any | null> {
    if (!isValidUuid(providerId)) return null;
    const res = await getPool().query(
      `SELECT p.*, u.name, u.phone, u.avatar_url, u.email 
       FROM providers p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.id = $1`,
      [providerId]
    );
    if (!res.rows[0]) return null;
    const provider = mapProvider(res.rows[0]);
    const sRes = await getPool().query('SELECT service_id FROM provider_services WHERE provider_id = $1', [provider.id]);
    provider.serviceIds = sRes.rows.map((r: any) => r.service_id);
    return provider;
  },

  async updateServiceRadiusByUserId(userId: string, radius: number): Promise<boolean> {
    if (!isValidUuid(userId)) return false;
    const res = await getPool().query(
      'UPDATE providers SET service_radius = $1 WHERE user_id = $2',
      [radius, userId]
    );
    return (res.rowCount ?? 0) > 0;
  },

  async updateWorkingHoursByUserId(userId: string, workingHours: string): Promise<boolean> {
    if (!isValidUuid(userId)) return false;
    const res = await getPool().query(
      'UPDATE providers SET working_hours = $1 WHERE user_id = $2',
      [workingHours, userId]
    );
    return (res.rowCount ?? 0) > 0;
  },

  async getStats(providerId: string): Promise<any> {
    if (!isValidUuid(providerId)) {
      return {
        earningsToday: 0,
        total_jobs: 0,
        completed_jobs: 0,
        rating: 5.0,
        total_reviews: 0
      };
    }
    const earningsRes = await getPool().query(
      "SELECT SUM(amount) as total FROM wallet_transactions WHERE user_id = (SELECT user_id FROM providers WHERE id = $1) AND type = 'credit' AND created_at >= CURRENT_DATE",
      [providerId]
    );
    const totalJobsRes = await getPool().query(
      "SELECT COUNT(*) as count FROM bookings WHERE provider_id = $1",
      [providerId]
    );
    const completedJobsRes = await getPool().query(
      "SELECT COUNT(*) as count FROM bookings WHERE provider_id = $1 AND status = 'completed'",
      [providerId]
    );
    const avgRatingRes = await getPool().query(
      "SELECT AVG(rating) as avg, COUNT(*) as count FROM ratings WHERE provider_id = $1",
      [providerId]
    );
    const ratingRes = await getPool().query(
      "SELECT rating FROM providers WHERE id = $1",
      [providerId]
    );

    const dbRating = parseFloat(ratingRes.rows[0]?.rating || '0');
    const avgRating = avgRatingRes.rows[0]?.avg ? parseFloat(avgRatingRes.rows[0].avg) : (dbRating > 0 ? dbRating : 5.0);

    return {
      earningsToday: parseFloat(earningsRes.rows[0]?.total || '0'),
      total_jobs: parseInt(totalJobsRes.rows[0]?.count || '0'),
      completed_jobs: parseInt(completedJobsRes.rows[0]?.count || '0'),
      rating: avgRating,
      total_reviews: parseInt(avgRatingRes.rows[0]?.count || '0')
    };
  },

  async findByServiceId(serviceId: string): Promise<any[]> {
    const res = await getPool().query(
      `SELECT p.*, u.name, u.phone, u.avatar_url 
       FROM providers p 
       JOIN users u ON p.user_id = u.id 
       JOIN provider_services ps ON p.id = ps.provider_id 
       WHERE ps.service_id = $1`,
      [serviceId]
    );
    return res.rows.map(mapProvider);
  },

  async findAllOnline(): Promise<any[]> {
    const res = await getPool().query(
      `SELECT p.*, u.name, u.phone, u.avatar_url 
       FROM providers p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.is_online = true
       ORDER BY p.rating DESC
       LIMIT 20`
    );
    return res.rows.map(mapProvider);
  },

  async register(
    userId: string,
    data: {
      bio: string;
      experienceYears: number;
      workingHours: string;
      serviceRadius: number;
      serviceIds: string[];
    }
  ): Promise<Provider> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Update user role to provider
      await client.query("UPDATE users SET role = 'provider' WHERE id = $1", [userId]);

      let serviceCategories: string[] = [];
      if (data.serviceIds && data.serviceIds.length > 0) {
        const sRes = await client.query(
          'SELECT label FROM services WHERE id = ANY($1)',
          [data.serviceIds]
        );
        serviceCategories = sRes.rows.map((r: any) => r.label);
      }

      // 2. Insert provider profile (pending admin approval)
      const providerRes = await client.query(
        `INSERT INTO providers (user_id, bio, experience_years, working_hours, service_radius, is_verified, is_online, rating, lat, lng, display_location, service_category) 
         SELECT $1, $2, $3::integer, $4, $5::integer, false, true, 5.0, lat, lng, display_location, $6::character varying[] FROM users WHERE id = $1
         RETURNING *`,
        [userId, data.bio, data.experienceYears, data.workingHours, data.serviceRadius, serviceCategories]
      );
      const provider = providerRes.rows[0];

      // 3. Insert provider services
      if (data.serviceIds && data.serviceIds.length > 0) {
        for (const serviceId of data.serviceIds) {
          await client.query(
            'INSERT INTO provider_services (provider_id, service_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [provider.id, serviceId]
          );
        }
      }

      await client.query('COMMIT');
      const mapped = mapProvider(provider);

      // Fire-and-forget: create admin notification outside transaction so it can't rollback registration
      pool.query(
        `INSERT INTO notifications (user_id, title, message, type, data, is_read)
         VALUES (NULL, $1, $2, 'provider_registration', $3::jsonb, false)`,
        [
          'New Provider Registration',
          `${provider.name || 'A provider'} has submitted a registration and requires approval.`,
          JSON.stringify({ provider_id: provider.id, provider_name: provider.name }),
        ]
      ).then(r => {
        console.log('[ProviderModel] Admin notification created:', r.rows[0]?.id);
      }).catch(err => {
        console.error('[ProviderModel] Non-fatal: failed to create admin notification:', err.message);
      });

      return mapped;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
};
