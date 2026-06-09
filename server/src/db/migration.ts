import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../server/.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    await pool.query(`
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS voice_note BOOLEAN DEFAULT false;
      
      CREATE TABLE IF NOT EXISTS provider_video_portfolios (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
          video_url TEXT NOT NULL,
          storage_path TEXT NOT NULL,
          uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          status TEXT DEFAULT 'Active',
          duration_seconds INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_provider_video_portfolios_provider ON provider_video_portfolios(provider_id);
    `);
    console.log('Migration successful');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}
run();
