import fs from 'fs';
import path from 'path';
import { getPool } from '../config/database';

async function initDb() {
  const pool = getPool();
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('[db] Executing schema.sql...');
    await pool.query(schema);
    console.log('[db] Schema executed successfully');
    
    process.exit(0);
  } catch (err) {
    console.error('[db] Error initializing database:', err);
    process.exit(1);
  }
}

initDb();
