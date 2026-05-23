import { Request, Response } from 'express';
import { getPool } from '../config/database';
const db = { query: (sql: string, params?: any[]) => getPool().query(sql, params) };

export class WebhookController {
  static async handleCashfreeWebhook(req: Request, res: Response) {
    try {
      const event = req.body;
      console.log('[Webhook] Cashfree event received:', JSON.stringify(event));

      const { id, event: eventName, data, status } = event;
      
      const requestId = id || (data && data.id);
      const verifyStatus = status || (data && data.verification) || (data && data.status);

      if (requestId && verifyStatus) {
        // Find user by request_id from kyc_audit_logs
        const result = await db.query(
          `SELECT user_id, type FROM kyc_audit_logs WHERE request_id = $1 ORDER BY timestamp DESC LIMIT 1`,
          [requestId]
        );

        if (result.rows.length > 0) {
          const { user_id, type } = result.rows[0];

          await db.query(
            `INSERT INTO kyc_audit_logs (user_id, type, status, request_id) VALUES ($1, $2, $3, $4)`,
            [user_id, type.replace('_INIT', '_WEBHOOK'), verifyStatus, requestId]
          );

          if (verifyStatus === 'success' || verifyStatus === 'complete' || verifyStatus === 'SUCCESS') {
            if (type.startsWith('BANK_VERIFY')) {
               // Additional logic if needed.
               console.log(`[Webhook] Bank verification successful for user: ${user_id}`);
            }
          }
        }
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('[Webhook] Error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
