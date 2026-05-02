import { getPool } from '../config/database';

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
    const res = await getPool().query('SELECT * FROM users WHERE phone = $1', [phone]);
    return res.rows[0] || null;
  },

  async create(user: Partial<User>): Promise<User> {
    const res = await getPool().query(
      'INSERT INTO users (phone, name, email, address, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [user.phone, user.name, user.email, user.address, user.role || 'customer']
    );
    return res.rows[0];
  },

  async update(id: string, patch: Partial<User>): Promise<User> {
    const keys = Object.keys(patch);
    const values = Object.values(patch);
    const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
    
    const res = await getPool().query(
      `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return res.rows[0];
  },

  async delete(id: string): Promise<void> {
    await getPool().query('DELETE FROM users WHERE id = $1', [id]);
  }
};
