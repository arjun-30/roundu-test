import fs from 'fs';
import path from 'path';
import { getPool } from '../config/database';

async function migrate() {
  const pool = getPool();
  try {
    // 1. Ensure migrations table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Run schema.sql first if not already done
    const schemaExecuted = await pool.query("SELECT * FROM migrations WHERE name = 'schema.sql'");
    if (schemaExecuted.rows.length === 0) {
      console.log('[migrate] Running schema.sql...');
      const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
      await pool.query(schemaSql);
      await pool.query("INSERT INTO migrations (name) VALUES ('schema.sql')");
      console.log('[migrate] schema.sql executed');
    }

    // 3. Run all files in migrations folder
    const migrationsDir = path.resolve(__dirname, '../../migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      const alreadyRun = await pool.query("SELECT * FROM migrations WHERE name = $1", [file]);
      if (alreadyRun.rows.length === 0) {
        console.log(`[migrate] Running ${file}...`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await pool.query(sql);
        await pool.query("INSERT INTO migrations (name) VALUES ($1)", [file]);
        console.log(`[migrate] ${file} executed`);
      }
    }

    console.log('[migrate] All migrations completed');
    process.exit(0);
  } catch (err) {
    console.error('[migrate] Error:', err);
    process.exit(1);
  }
}

migrate();
