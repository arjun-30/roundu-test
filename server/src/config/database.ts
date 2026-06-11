import { Pool } from 'pg';
import { env } from './env';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
    pool.on('error', (err) => {
      console.error('Unexpected pg pool error:', err);
    });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function pingDb(): Promise<boolean> {
  try {
    const result = await getPool().query('SELECT 1 AS ok');
    return result.rows[0]?.ok === 1;
  } catch {
    return false;
  }
}
