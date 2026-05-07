import pg from './server/node_modules/pg/lib/index.js';
const { Pool } = pg;

const url = process.env.DATABASE_URL || 'postgresql://roundu:roundu@localhost:5432/roundu';
const pool = new Pool({ connectionString: url, ssl: url.includes('railway') ? { rejectUnauthorized: false } : false });

try {
  const user = await pool.query(`SELECT id, phone, role, name FROM users WHERE phone = '8939914555'`);
  console.log('USER:', JSON.stringify(user.rows, null, 2));

  if (user.rows[0]) {
    const userId = user.rows[0].id;
    const provider = await pool.query(`SELECT * FROM providers WHERE user_id = $1`, [userId]);
    console.log('PROVIDER:', JSON.stringify(provider.rows, null, 2));

    if (provider.rows[0]) {
      const providerId = provider.rows[0].id;
      const services = await pool.query(`SELECT service_id FROM provider_services WHERE provider_id = $1`, [providerId]);
      console.log('SERVICE_IDS:', JSON.stringify(services.rows, null, 2));
    } else {
      console.log('NO PROVIDER RECORD FOUND - this is the problem!');
    }
  } else {
    console.log('NO USER FOUND with this phone number!');
  }
} catch (e) {
  console.error('DB error:', e.message);
} finally {
  await pool.end();
}
