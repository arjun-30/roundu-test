const { Pool } = require('pg');
require('dotenv').config({ path: 'server/.env' });

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log("=== SERVICES ===");
    const sRes = await pool.query("SELECT * FROM services");
    console.table(sRes.rows);

    console.log("\n=== PROVIDERS ===");
    const pRes = await pool.query(`
      SELECT p.id, p.user_id, u.name, p.is_online, p.is_verified, p.service_radius, p.lat, p.lng, p.service_category
      FROM providers p
      JOIN users u ON p.user_id = u.id
    `);
    console.table(pRes.rows);

    console.log("\n=== PROVIDER SERVICES JUNCTION ===");
    const psRes = await pool.query(`
      SELECT ps.provider_id, u.name, ps.service_id
      FROM provider_services ps
      JOIN providers p ON ps.provider_id = p.id
      JOIN users u ON p.user_id = u.id
    `);
    console.table(psRes.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
