import { Request, Response } from 'express';
import { SetuService } from '../services/setu.service';
import { getPool } from '../config/database';
const db = { query: (sql: string, params?: any[]) => getPool().query(sql, params) };
import { sendError, sendSuccess } from '../utils/response';
import { env } from '../config/env';
import crypto from 'crypto';

export class KycController {
  static async initDigilocker(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { clientRedirectUrl } = req.body;
      const redirectUrl = clientRedirectUrl || `${env.APP_BASE_URL}/provider/digilocker-kyc`;
      
      const setuRes = await SetuService.createDigilockerRequest(redirectUrl);
      
      await db.query(
        `INSERT INTO kyc_audit_logs (user_id, type, status) VALUES ($1, $2, $3)`,
        [userId, 'AADHAAR_INIT', 'pending']
      );

      return sendSuccess(res, { id: setuRes.id, url: setuRes.url });
    } catch (error: any) {
      console.error('[KYC] initDigilocker Error:', error?.response?.data || error);
      return sendError(res, 500, 'KYC_ERROR', 'Failed to initialize Aadhaar verification');
    }
  }

  static async verifyDigilocker(req: Request, res: Response) {
    try {
      const { requestId } = req.body;
      const userId = req.user!.id;

      if (!requestId) return sendError(res, 400, 'VALIDATION_ERROR', 'requestId is required');

      const setuRes = await SetuService.getDigilockerStatus(requestId);

      if (setuRes.status === 'complete' && setuRes.aadhaar) {
        const aadhaarNum = setuRes.aadhaar.maskedNumber || '';
        const masked = aadhaarNum.slice(-4);
        
        // Log to audit
        await db.query(
          `INSERT INTO kyc_audit_logs (user_id, type, status) VALUES ($1, $2, $3)`,
          [userId, 'AADHAAR_VERIFY', 'success']
        );

        // Update user
        await db.query(
          `UPDATE users SET masked_aadhaar = $1 WHERE id = $2`,
          [masked, userId]
        );

        // Optional: Save verified name to vault
        const name = setuRes.aadhaar.name;
        if (name) {
          const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(env.JWT_SECRET!.padEnd(32, '0').slice(0, 32)), Buffer.alloc(16, 0));
          let encryptedName = cipher.update(name, 'utf8', 'hex');
          encryptedName += cipher.final('hex');

          await db.query(
            `INSERT INTO kyc_encrypted_vault (user_id, verified_name_encrypted) VALUES ($1, $2)`,
            [userId, encryptedName]
          );
        }

        return sendSuccess(res, { verified: true, name: setuRes.aadhaar.name });
      }

      return sendSuccess(res, { verified: false, status: setuRes.status });
    } catch (error: any) {
      console.error('[KYC] verifyDigilocker Error:', error?.response?.data || error);
      return sendError(res, 500, 'KYC_ERROR', 'Failed to verify Aadhaar status');
    }
  }

  static async verifyPan(req: Request, res: Response) {
    try {
      const { pan } = req.body;
      const userId = req.user!.id;

      if (!pan) return sendError(res, 400, 'VALIDATION_ERROR', 'PAN is required');

      const setuRes = await SetuService.verifyPan(pan);

      if (setuRes.verification === 'SUCCESS') {
        await db.query(
          `INSERT INTO kyc_audit_logs (user_id, type, status) VALUES ($1, $2, $3)`,
          [userId, 'PAN_VERIFY', 'success']
        );

        return sendSuccess(res, { verified: true, data: setuRes.data });
      }

      await db.query(
        `INSERT INTO kyc_audit_logs (user_id, type, status) VALUES ($1, $2, $3)`,
        [userId, 'PAN_VERIFY', 'failed']
      );
      
      return sendSuccess(res, { verified: false, message: setuRes.message });
    } catch (error: any) {
      console.error('[KYC] verifyPan Error:', error?.response?.data || error);
      return sendError(res, 500, 'KYC_ERROR', 'Failed to verify PAN');
    }
  }

  static async initBankVerify(req: Request, res: Response) {
    try {
      const { ifsc, accountNumber } = req.body;
      const userId = req.user!.id;

      if (!ifsc || !accountNumber) return sendError(res, 400, 'VALIDATION_ERROR', 'IFSC and Account Number required');

      const setuRes = await SetuService.verifyBankAsync(ifsc, accountNumber);

      await db.query(
        `INSERT INTO kyc_audit_logs (user_id, type, status, request_id) VALUES ($1, $2, $3, $4)`,
        [userId, 'BANK_VERIFY_INIT', 'pending', setuRes.id]
      );

      return sendSuccess(res, { requestId: setuRes.id });
    } catch (error: any) {
      console.error('[KYC] initBankVerify Error:', error?.response?.data || error);
      return sendError(res, 500, 'KYC_ERROR', 'Failed to initiate bank verification');
    }
  }

  static async getBankVerifyStatus(req: Request, res: Response) {
    try {
      const { requestId } = req.params;
      const userId = req.user!.id;

      const setuRes = await SetuService.getBankVerifyStatus(requestId);

      if (setuRes.verification === 'success') {
        await db.query(
          `INSERT INTO kyc_audit_logs (user_id, type, status) VALUES ($1, $2, $3)`,
          [userId, 'BANK_VERIFY', 'success']
        );
        return sendSuccess(res, { verified: true });
      } else if (setuRes.verification === 'failed') {
        await db.query(
          `INSERT INTO kyc_audit_logs (user_id, type, status) VALUES ($1, $2, $3)`,
          [userId, 'BANK_VERIFY', 'failed']
        );
      }

      return sendSuccess(res, { verified: false, status: setuRes.verification, message: setuRes.message });
    } catch (error: any) {
      console.error('[KYC] getBankVerifyStatus Error:', error?.response?.data || error);
      return sendError(res, 500, 'KYC_ERROR', 'Failed to check bank verification status');
    }
  }

  static async markKycComplete(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      
      await db.query(
        `UPDATE users SET kyc_status = 'verified', verified_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [userId]
      );
      
      await db.query(
        `UPDATE providers SET is_verified = true WHERE user_id = $1`,
        [userId]
      );

      return sendSuccess(res, { complete: true });
    } catch (error) {
      return sendError(res, 500, 'DB_ERROR', 'Failed to complete KYC');
    }
  }
}
