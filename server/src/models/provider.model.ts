import { getPool } from '../config/database';

export interface Provider {
  id: string;
  user_id: string;
  bio: string | null;
  experience_years: number;
  rating: number;
  response_rate: number;
  is_online: boolean;
  service_radius: number;
  working_hours: string | null;
  lat?: number | null;
  lng?: number | null;
  display_location?: string | null;
}

export const ProviderModel = {
  async findByUserId(userId: string): Promise<Provider | null> {
    const res = await getPool().query('SELECT * FROM providers WHERE user_id = $1', [userId]);
    return res.rows[0] || null;
  },

  async findById(providerId: string): Promise<any | null> {
    const res = await getPool().query(
      `SELECT p.*, u.name, u.phone, u.avatar_url, u.email 
       FROM providers p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.id = $1`,
      [providerId]
    );
    return res.rows[0] || null;
  },

  async updateServiceRadiusByUserId(userId: string, radius: number): Promise<boolean> {
    const res = await getPool().query(
      'UPDATE providers SET service_radius = $1 WHERE user_id = $2',
      [radius, userId]
    );
    return (res.rowCount ?? 0) > 0;
  },

  async updateWorkingHoursByUserId(userId: string, workingHours: string): Promise<boolean> {
    const res = await getPool().query(
      'UPDATE providers SET working_hours = $1 WHERE user_id = $2',
      [workingHours, userId]
    );
    return (res.rowCount ?? 0) > 0;
  },

  async getStats(providerId: string): Promise<any> {
    const earningsRes = await getPool().query(
      "SELECT SUM(amount) as total FROM wallet_transactions WHERE user_id = (SELECT user_id FROM providers WHERE id = $1) AND type = 'credit' AND created_at >= CURRENT_DATE",
      [providerId]
    );
    const jobsRes = await getPool().query(
      "SELECT COUNT(*) as count FROM bookings WHERE provider_id = $1 AND status = 'completed'",
      [providerId]
    );
    return {
      earningsToday: parseFloat(earningsRes.rows[0]?.total || '0'),
      completedJobs: parseInt(jobsRes.rows[0]?.count || '0')
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
    return res.rows;
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
    return res.rows;
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

      // 2. Insert provider profile (auto-verify for now since they passed DigiLocker)
      const providerRes = await client.query(
        `INSERT INTO providers (user_id, bio, experience_years, working_hours, service_radius, is_verified, is_online, rating, lat, lng, display_location) 
         SELECT $1, $2, $3, $4, $5, true, true, 5.0, lat, lng, display_location FROM users WHERE id = $1
         RETURNING *`,
        [userId, data.bio, data.experienceYears, data.workingHours, data.serviceRadius]
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
      return provider;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
};
