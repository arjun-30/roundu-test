import { getPool } from '../../src/config/database';

async function seed() {
  const pool = getPool();
  try {
    const u1 = await pool.query("INSERT INTO users (phone, name, role) VALUES ('9999999991', 'Rajesh Kumar', 'provider') ON CONFLICT (phone) DO NOTHING RETURNING id");
    const u2 = await pool.query("INSERT INTO users (phone, name, role) VALUES ('9999999992', 'Suresh Menon', 'provider') ON CONFLICT (phone) DO NOTHING RETURNING id");
    const u3 = await pool.query("INSERT INTO users (phone, name, role) VALUES ('9999999993', 'Deepak Jain', 'provider') ON CONFLICT (phone) DO NOTHING RETURNING id");
    
    const getU = async (phone: string) => (await pool.query('SELECT id FROM users WHERE phone=$1', [phone])).rows[0].id;
    const id1 = await getU('9999999991');
    const id2 = await getU('9999999992');
    const id3 = await getU('9999999993');
    
    const p1 = await pool.query("INSERT INTO providers (user_id, bio, experience_years, rating, is_online, is_verified) VALUES ($1, 'Expert Plumber', 8, 4.9, true, true) RETURNING id", [id1]);
    const p2 = await pool.query("INSERT INTO providers (user_id, bio, experience_years, rating, is_online, is_verified) VALUES ($1, 'Certified Electrician', 5, 4.7, true, true) RETURNING id", [id2]);
    const p3 = await pool.query("INSERT INTO providers (user_id, bio, experience_years, rating, is_online, is_verified) VALUES ($1, 'Professional Housekeeping', 10, 4.8, true, true) RETURNING id", [id3]);
    
    const pid1 = p1.rows[0].id;
    const pid2 = p2.rows[0].id;
    const pid3 = p3.rows[0].id;
    
    await pool.query("INSERT INTO provider_services (provider_id, service_id) VALUES ($1, 'plumber'), ($1, 'electrician') ON CONFLICT DO NOTHING", [pid1]);
    await pool.query("INSERT INTO provider_services (provider_id, service_id) VALUES ($1, 'electrician') ON CONFLICT DO NOTHING", [pid2]);
    await pool.query("INSERT INTO provider_services (provider_id, service_id) VALUES ($1, 'housekeeping'), ($1, 'carwash') ON CONFLICT DO NOTHING", [pid3]);
    
    console.log('Successfully seeded 3 providers!');
  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    pool.end();
  }
}

seed();
