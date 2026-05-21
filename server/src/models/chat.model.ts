import { getPool } from '../config/database';

export interface ChatMessage {
  id?: string;
  booking_id: string;
  sender_id: string;
  sender_role: string;
  text: string;
  audio_base64?: string;
  is_seen?: boolean;
  created_at?: string;
}

export class ChatModel {
  static async createMessage(message: ChatMessage): Promise<ChatMessage> {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO chat_messages (booking_id, sender_id, sender_role, text, audio_base64) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [message.booking_id, message.sender_id, message.sender_role, message.text, message.audio_base64 || null]
    );
    return result.rows[0];
  }

  static async getMessagesByBooking(bookingId: string): Promise<ChatMessage[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT * FROM chat_messages WHERE booking_id = $1 ORDER BY created_at ASC`,
      [bookingId]
    );
    return result.rows;
  }

  static async markMessagesAsSeen(bookingId: string, recipientId: string): Promise<void> {
    const pool = getPool();
    // Mark messages as seen where the sender is NOT the recipient
    await pool.query(
      `UPDATE chat_messages SET is_seen = true 
       WHERE booking_id = $1 AND sender_id != $2 AND is_seen = false`,
      [bookingId, recipientId]
    );
  }
}
