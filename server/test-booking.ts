import { getPool } from './src/config/database';

async function test() {
  try {
    const pool = getPool();
    // First, find a valid customer and provider
    const userRes = await pool.query("SELECT id FROM users WHERE role = 'customer' LIMIT 1");
    const providerRes = await pool.query("SELECT id FROM providers LIMIT 1");
    
    if (userRes.rows.length === 0 || providerRes.rows.length === 0) {
      console.log("No users or providers found");
      process.exit(1);
    }

    const customerId = userRes.rows[0].id;
    const providerId = providerRes.rows[0].id;

    console.log("Customer ID:", customerId);
    console.log("Provider ID:", providerId);

    const bookingData = {
      customer_id: customerId,
      provider_id: providerId,
      service_id: "plumber",
      scheduled_at: `${new Date().toISOString().slice(0, 10)} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      address: "Client Address",
      price: 500,
      notes: "Quick fix requested",
      voice_note: false
    };

    const res = await pool.query(
      'INSERT INTO bookings (customer_id, provider_id, service_id, status, scheduled_at, address, price, notes, voice_note) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [bookingData.customer_id, bookingData.provider_id, bookingData.service_id, 'pending', bookingData.scheduled_at, bookingData.address, bookingData.price, bookingData.notes, bookingData.voice_note]
    );

    console.log("Success:", res.rows[0]);
  } catch (err) {
    console.error("Error inserting booking:", err);
  }
  process.exit(0);
}

test();
