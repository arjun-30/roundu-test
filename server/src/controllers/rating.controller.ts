import { Request, Response } from 'express';
import { getPool } from '../config/database';

export const submitRating = async (req: Request, res: Response) => {
  const { booking_id, customer_id, provider_id, rating, comment } = req.body;
  try {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO ratings (booking_id, customer_id, provider_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [booking_id, customer_id, provider_id, rating, comment]
    );

    // Update the provider's overall rating
    const avgResult = await pool.query(
      `SELECT AVG(rating) as avg_rating, COUNT(id) as total_reviews FROM ratings WHERE provider_id = $1`,
      [provider_id]
    );
    const newAvg = parseFloat(avgResult.rows[0].avg_rating || '0').toFixed(2);
    await pool.query(
      `UPDATE providers SET rating = $1 WHERE id = $2`,
      [newAvg, provider_id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error submitting rating:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getProviderRatings = async (req: Request, res: Response) => {
  const { providerId } = req.params;
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT r.*, u.name as customer_name, u.avatar_url as customer_avatar 
       FROM ratings r 
       LEFT JOIN users u ON r.customer_id = u.id 
       WHERE r.provider_id = $1 
       ORDER BY r.created_at DESC`,
      [providerId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching ratings:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
