const { Pool } = require('c:/Users/NIRMAL/Downloads/roundu-test/server/node_modules/pg');

const url = process.env.DATABASE_URL || 'postgresql://roundu:roundu@localhost:5432/roundu';
const pool = new Pool({ connectionString: url });

async function main() {
  try {
    const res = await pool.query(
      `SELECT table_name, column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name IN ('users', 'providers')
       ORDER BY table_name, column_name`
    );
    console.log('COLUMNS:');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
