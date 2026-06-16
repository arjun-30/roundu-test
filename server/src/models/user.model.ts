import { getPool } from '../config/database';
import { env } from '../config/env';
import { isValidUuid } from '../utils/uuid';

export interface User {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  address: string | null;
  role: string;
  lat?: number | null;
  lng?: number | null;
  display_location?: string | null;
}

export const UserModel = {
  async findByPhone(phone: string): Promise<User | null> {
    try {
      const res = await getPool().query('SELECT * FROM users WHERE phone = $1', [phone]);
      return res.rows[0] || null;
    } catch (err) {
      if (env.isDevelopment) {
        console.warn('[UserModel] DB Error in findByPhone, returning null for mock flow');
        return null;
      }
      throw err;
    }
  },

  async create(user: Partial<User>): Promise<User> {
    try {
      const columns = ['phone', 'name', 'email', 'address', 'lat', 'lng', 'display_location'];
      const values: any[] = [user.phone, user.name ?? null, user.email ?? null, user.address ?? null, user.lat ?? null, user.lng ?? null, user.display_location ?? null];

      if (user.role !== undefined) {
        columns.splice(4, 0, 'role');
        values.splice(4, 0, user.role);
      }

      const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
      const query = `INSERT INTO users (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
      const res = await getPool().query(query, values);
      return res.rows[0];
    } catch (err) {
      if (env.isDevelopment) {
        console.warn('[UserModel] DB Error in create, returning mock user');
        return {
          id: 'mock-user-id',
          phone: user.phone || '0000000000',
          name: 'Mock User',
          email: 'mock@example.com',
          address: 'Mock Address, City',
          role: user.role || 'customer',
          lat: user.lat ?? null,
          lng: user.lng ?? null,
          display_location: user.display_location ?? null
        };
      }
      throw err;
    }
  },

  async update(id: string, patch: Partial<User>): Promise<User> {
    try {
      const keys = Object.keys(patch);
      const values = Object.values(patch);
      const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');

      const res = await getPool().query(
        `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
        [id, ...values]
      );

      // If the patch contains lat, lng, or display_location, also update the corresponding provider record
      if (patch.lat !== undefined || patch.lng !== undefined || patch.display_location !== undefined) {
        try {
          await getPool().query(
            `UPDATE providers SET 
              lat = COALESCE($2, lat), 
              lng = COALESCE($3, lng), 
              display_location = COALESCE($4, display_location),
              updated_at = CURRENT_TIMESTAMP 
             WHERE user_id = $1`,
            [id, patch.lat ?? null, patch.lng ?? null, patch.display_location ?? null]
          );
        } catch (err) {
          console.error('[UserModel] Failed to sync location to providers table:', err);
        }
      }

      return res.rows[0];
    } catch (err) {
      if (env.isDevelopment) {
        console.warn('[UserModel] DB Error in update, returning mock updated user');
        return {
          id,
          phone: '0000000000',
          name: patch.name || 'Mock User',
          email: patch.email || 'mock@example.com',
          address: patch.address || 'Mock Address',
          role: patch.role || 'customer',
          ...patch
        };
      }
      throw err;
    }
  },

  async delete(id: string): Promise<void> {
    if (!isValidUuid(id)) return;
    await getPool().query('DELETE FROM users WHERE id = $1', [id]);
  },

  async incrementSessionVersion(id: string): Promise<number> {
    try {
      const res = await getPool().query(
        'UPDATE users SET session_version = COALESCE(session_version, 1) + 1 WHERE id = $1 RETURNING session_version',
        [id]
      );
      return res.rows[0]?.session_version || 1;
    } catch (err) {
      if (env.isDevelopment) {
        console.warn('[UserModel] DB Error in incrementSessionVersion, returning 1');
        return 1;
      }
      throw err;
    }
  }
};
