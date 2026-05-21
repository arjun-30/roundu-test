import { getPool } from '../config/database';
import { env } from '../config/env';

export interface User {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  address: string | null;
  role: string;
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
      const res = await getPool().query(
        'INSERT INTO users (phone, name, email, address, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [user.phone, user.name, user.email, user.address, user.role || 'customer']
      );
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
          role: user.role || 'customer'
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
