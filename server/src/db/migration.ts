import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../server/.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    await pool.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS voice_note BOOLEAN DEFAULT false;');
    console.log('Migration successful');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    pool.end();
  }
}
run();
