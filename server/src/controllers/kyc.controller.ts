import { Request, Response } from 'express';
import { CashfreeService } from '../services/cashfree.service';
import { getPool } from '../config/database';
const db = { query: (sql: string, params?: any[]) => getPool().query(sql, params) };
import { sendError, sendSuccess } from '../utils/response';
import { env } from '../config/env';
import crypto from 'crypto';

export class KycController {
  static async initDigilocker(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const userPhone = req.user!.phone;
      const { clientRedirectUrl } = req.body;
      const redirectUrl = clientRedirectUrl || `${env.APP_BASE_URL}/provider/digilocker-kyc`;

      // Gap 3 fix: keep under 50 chars — Cashfree hard limit
      const verificationId = `kya-${userId.slice(0, 8)}-${Date.now()}`;

      // Store BEFORE calling Cashfree — survives crashes
      await db.query(
        `INSERT INTO kyc_audit_logs (user_id, type, status, request_id) VALUES ($1, $2, $3, $4)`,
        [userId, 'AADHAAR_INIT', 'pending', verificationId]
      );

      // Determine user_flow — phone used because Aadhaar not available yet (see Gap 1 note)
      // Gap 2 fix: checkId kept under 50 chars
      const checkId = `chk-${userId.slice(0, 8)}-${Date.now()}`;
      let userFlow: 'signin' | 'signup' = 'signup';

      if (userPhone) {
        try {
          const accountCheck = await CashfreeService.checkDigilockerAccount(userPhone, checkId);
          if (accountCheck.status === 'ACCOUNT_EXISTS') userFlow = 'signin';
        } catch (err) {
          // Non-fatal — default to signup if check fails
          console.warn('[KYC] DigiLocker account check failed, defaulting to signup', err);
        }
      } else {
        console.warn('[KYC] userPhone missing from JWT, defaulting to signup');
      }

      const cfRes = await CashfreeService.createDigilockerRequest(redirectUrl, verificationId, userFlow);

      // Update with Cashfree reference_id
      await db.query(
        `UPDATE kyc_audit_logs SET request_id = $1 WHERE user_id = $2 AND type = 'AADHAAR_INIT' AND request_id = $3`,
        [cfRes.reference_id?.toString() || verificationId, userId, verificationId]
      );

      return sendSuccess(res, { id: verificationId, url: cfRes.url });
    } catch (error: any) {
      console.error('[KYC] initDigilocker Error:', error?.response?.data || error);
      return res.status(500).json({ success: false, message: `Verification error: ${error?.response?.data?.message || 'Unknown server error'}` });
    }
  }

  static async verifyDigilocker(req: Request, res: Response) {
    try {
      const { requestId } = req.body; // this is our verificationId
      const userId = req.user!.id;

      if (!requestId) return sendError(res, 400, 'VALIDATION_ERROR', 'requestId is required');

      // Mock bypass — remove before production
      if (requestId === 'mock-request-id-123' && env.NODE_ENV !== 'production') {
        await db.query(`UPDATE users SET masked_aadhaar = $1 WHERE id = $2`, ['1234', userId]);
        return sendSuccess(res, { verified: true, name: 'Mock User (Demo)' });
      }

      const statusRes = await CashfreeService.getDigilockerStatus(requestId);

      if (statusRes.status !== 'AUTHENTICATED') {
        return sendSuccess(res, { verified: false, status: statusRes.status });
      }

      // Gap 5 fix: eaadhaar=N — Aadhaar not in DigiLocker
      // Prompt user to link Aadhaar in DigiLocker, allow one retry, then OCR fallback
      if (statusRes.user_details?.eaadhaar === 'N') {
        return sendSuccess(res, {
          verified: false,
          status: 'AADHAAR_NOT_LINKED',
          retryable: true,
          fallback: 'OCR', // frontend can offer OCR path if user can't link
          message: 'Aadhaar not linked in DigiLocker. Please link Aadhaar in your DigiLocker account and try again.'
        });
      }

      // Gap 4: 202 retry handled inside getDigilockerDocument (service layer)
      const docRes = await CashfreeService.getDigilockerDocument(requestId, 'AADHAAR');

      if (!docRes || docRes.status !== 'SUCCESS') {
        return sendSuccess(res, {
          verified: false,
          status: docRes?.status || 'FETCH_FAILED',
          fallback: 'OCR'
        });
      }

      const maskedAadhaar = (docRes.uid || '').slice(-4);
      const verifiedName = docRes.name;

      await db.query(
        `INSERT INTO kyc_audit_logs (user_id, type, status) VALUES ($1, $2, $3)`,
        [userId, 'AADHAAR_VERIFY', 'success']
      );
      await db.query(
        `UPDATE users SET masked_aadhaar = $1 WHERE id = $2`,
        [maskedAadhaar, userId]
      );

      if (verifiedName) {
        const cipher = crypto.createCipheriv(
          'aes-256-cbc',
          Buffer.from(env.JWT_SECRET!.padEnd(32, '0').slice(0, 32)),
          Buffer.alloc(16, 0)
        );
        let encryptedName = cipher.update(verifiedName, 'utf8', 'hex');
        encryptedName += cipher.final('hex');
        await db.query(
          `INSERT INTO kyc_encrypted_vault (user_id, verified_name_encrypted)
           VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET verified_name_encrypted = $2`,
          [userId, encryptedName]
        );
      }

      return sendSuccess(res, { verified: true, name: verifiedName });
    } catch (error: any) {
      console.error('[KYC] verifyDigilocker Error:', error?.response?.data || error);
      return sendError(res, 500, 'KYC_ERROR', 'Failed to verify Aadhaar status');
    }
  }

  static async verifyPan(req: Request, res: Response) {
    try {
      const { pan } = req.body;
      const userId = req.user!.id;
      const userName = (req.user as any)?.name; // for name matching

      // Gap 6 fix: validate format before burning API credit
      if (!pan) return sendError(res, 400, 'VALIDATION_ERROR', 'PAN is required');
      const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!PAN_REGEX.test(pan.toUpperCase())) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid PAN format. Must be 5 letters, 4 digits, 1 letter.');
      }

      // Gap 7 fix: retry 500/502 once before failing
      let cfRes: any;
      try {
        cfRes = await CashfreeService.verifyPan(pan.toUpperCase(), userName || undefined);
      } catch (err: any) {
        if ([500, 502].includes(err?.response?.status)) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          try {
            cfRes = await CashfreeService.verifyPan(pan.toUpperCase(), userName || undefined);
          } catch {
            // Retry also failed — OCR fallback (wire in next iteration)
            return sendError(res, 503, 'SERVICE_UNAVAILABLE', 'PAN verification temporarily unavailable. Please try again.');
          }
        } else {
          if (err?.response?.status === 422) {
            return sendError(res, 422, 'INSUFFICIENT_BALANCE', 'Verification unavailable. Contact support.');
          }
          throw err;
        }
      }

      // Hard block: DELETED or DEACTIVATED
      if (['DELETED', 'DEACTIVATED'].includes(cfRes.pan_status)) {
        await db.query(
          `INSERT INTO kyc_audit_logs (user_id, type, status, request_id) VALUES ($1, $2, $3, $4)`,
          [userId, 'PAN_VERIFY', `hard_block_${cfRes.pan_status.toLowerCase()}`, String(cfRes.reference_id)]
        );
        return sendError(res, 422, 'PAN_INACTIVE', `PAN is ${cfRes.pan_status}. Contact support.`);
      }

      // Gap 10 fix: log INVALID distinctly, not as generic 'failed'
      const auditStatus = cfRes.valid
        ? 'success'
        : cfRes.pan_status === 'INVALID'
          ? 'invalid'
          : 'failed';

      await db.query(
        `INSERT INTO kyc_audit_logs (user_id, type, status, request_id) VALUES ($1, $2, $3, $4)`,
        [userId, 'PAN_VERIFY', auditStatus, String(cfRes.reference_id)]
      );

      if (!cfRes.valid) {
        return sendSuccess(res, { verified: false, message: cfRes.message || 'Invalid PAN' });
      }

      // Gap 8 fix: soft warning for Aadhaar-PAN not linked (Individual only)
      const seedingWarn =
        cfRes.aadhaar_seeding_status === 'R' && cfRes.type === 'Individual';

      // Gap 9 fix: soft warning for poor name match
      const nameMismatchWarn =
        ['POOR_PARTIAL_MATCH', 'NO_MATCH'].includes(cfRes.name_match_result);

      const warning = seedingWarn
        ? 'AADHAAR_PAN_NOT_LINKED'
        : nameMismatchWarn
          ? 'NAME_MISMATCH'
          : null;

      const warningMessage = seedingWarn
        ? 'Your Aadhaar is not linked to this PAN. This may affect some services.'
        : nameMismatchWarn
          ? 'Name does not closely match PAN records. Please verify your details.'
          : null;

      return sendSuccess(res, {
        verified: true,
        warning,
        warningMessage,   // null if no warning — frontend ignores null
        data: {
          full_name: cfRes.registered_name,
          pan_status: cfRes.pan_status,
          name_match_result: cfRes.name_match_result,
          name_match_score: cfRes.name_match_score
        }
      });
    } catch (error: any) {
      console.error('[KYC] verifyPan Error:', error?.response?.data || error);
      return sendError(res, 500, 'KYC_ERROR', 'Failed to verify PAN');
    }
  }

  // ─── Helper: alert ops ────────────────────────────────────────────────────
  private static async alertOps(subject: string, detail: any) {
    // Wire to Slack / email / PagerDuty as needed
    console.error(`[OPS ALERT] ${subject}`, detail);
  }

  // ─── Helper: handle fraud account ─────────────────────────────────────────
  private static async handleFraudAccount(userId: string, accountNumber: string, ifsc: string, res: Response) {
    // Flag user separately from account status — user may have different account after ops clearance
    await db.query(
      `UPDATE users SET fraud_flagged = TRUE, fraud_reason = $1, fraud_flagged_at = NOW() WHERE id = $2`,
      ['BAV_FRAUD_ACCOUNT', userId]
    );
    await db.query(
      `INSERT INTO fraud_flags (user_id, bank_account, ifsc, flagged_at) VALUES ($1, $2, $3, NOW())`,
      [userId, accountNumber, ifsc]
    );
    // Generic message — do NOT expose fraud detection logic to user
    return sendError(res, 422, 'VERIFICATION_FAILED', "We couldn't verify your account. Please contact support.");
  }

  // ─── initBankVerify ───────────────────────────────────────────────────────
  static async initBankVerify(req: Request, res: Response) {
    try {
      const { accountNumber, ifsc } = req.body;
      const userId = req.user!.id;
      const userName = (req.user as any)?.name;

      // Gap 15 fix: fraud gate — first check before anything else
      if ((req.user as any)?.fraud_flagged) {
        return res.status(403).json({ message: 'Account under review. Contact support.' });
      }

      if (!ifsc || !accountNumber) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'IFSC and Account Number are required');
      }

      // Gap 13 fix: 3-strike session lock
      const attemptRow = await db.query(
        `SELECT attempts, locked FROM bav_attempts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );
      const currentAttempts = attemptRow.rows[0]?.attempts ?? 0;
      const isLocked = attemptRow.rows[0]?.locked ?? false;

      if (isLocked || currentAttempts >= 3) {
        return res.status(429).json({
          success: false,
          locked: true,
          message: 'Too many failed attempts. Please contact support.'
        });
      }

      const requestId = `bav-${userId.slice(0, 8)}-${Date.now()}`;

      // Gap 11 & 12 fix: catch non-retryable errors explicitly
      let cfRes: any;
      try {
        // Gap 17: accountNumber first, ifsc second — matches service signature
        cfRes = await CashfreeService.verifyBankWithRetry(accountNumber, ifsc, userName || undefined);
      } catch (err: any) {
        const code = err?.response?.data?.code;

        if (code === 'fraud_account') {
          return KycController.handleFraudAccount(userId, accountNumber, ifsc, res);
        }

        if (code === 'insufficient_balance') {
          await KycController.alertOps('CASHFREE_BAV_BALANCE_EMPTY', { userId, timestamp: new Date() });
          return sendError(res, 503, 'SERVICE_UNAVAILABLE', 'Bank verification temporarily unavailable. Please try again later.');
        }

        if (err?.response?.status === 429) {
          return sendError(res, 429, 'RATE_LIMIT', 'Too many requests. Please wait a moment and try again.');
        }

        // Gap 14: retries exhausted — stub queue entry (penny drop wired in next iteration)
        await db.query(
          `INSERT INTO penny_drop_queue (user_id, bank_account, ifsc, name, status, reason, queued_at)
           VALUES ($1, $2, $3, $4, 'QUEUED', 'BAV_SYNC_EXHAUSTED', NOW())`,
          [userId, accountNumber, ifsc, userName || null]
        );
        return res.status(202).json({
          success: true,
          queued: true,
          message: 'Verification is being processed. You will be notified once complete.'
        });
      }

      const isValid = cfRes.account_status === 'VALID';
      const statusCode = cfRes.account_status_code;

      // Store result in audit log
      await db.query(
        `INSERT INTO kyc_audit_logs (user_id, type, status, request_id) VALUES ($1, $2, $3, $4)`,
        [userId, 'BANK_VERIFY', isValid ? 'success' : statusCode, requestId]
      );

      // Gap 13: increment attempt counter on non-valid result
      if (!isValid) {
        await db.query(
          `INSERT INTO bav_attempts (user_id, attempts, last_status_code, last_attempt_at)
           VALUES ($1, 1, $2, NOW())
           ON CONFLICT (user_id) DO UPDATE
           SET attempts = bav_attempts.attempts + 1,
               last_status_code = $2,
               last_attempt_at = NOW()`,
          [userId, statusCode]
        );
      }

      return sendSuccess(res, { requestId });
    } catch (error: any) {
      console.error('[KYC] initBankVerify Error:', error?.response?.data || error);
      return sendError(res, 500, 'KYC_ERROR', 'Failed to initiate bank verification');
    }
  }

  static async getBankVerifyStatus(req: Request, res: Response) {
    try {
      const { requestId } = req.params;
      const userId = req.user!.id;

      // Mock bypass — remove before production
      if (requestId === 'mock-bank-req-123' && env.NODE_ENV !== 'production') {
        return sendSuccess(res, { verified: true });
      }

      const result = await db.query(
        `SELECT status FROM kyc_audit_logs
         WHERE request_id = $1 AND user_id = $2 AND type = 'BANK_VERIFY' LIMIT 1`,
        [requestId, userId]
      );

      if (!result.rows.length) {
        return sendError(res, 404, 'NOT_FOUND', 'Bank verification request not found');
      }

      const status = result.rows[0].status;

      if (status === 'success') {
        return sendSuccess(res, { verified: true });
      }

      const FAILURE_MESSAGES: Record<string, string> = {
        INVALID_ACCOUNT_FAIL: "We couldn't find this account. Please check your account number and try again.",
        ACCOUNT_BLOCKED: 'This account appears to be blocked by your bank. Please try a different account.',
        INVALID_IFSC_FAIL: 'The IFSC code is invalid. Please check your cheque book or bank passbook.',
        NRE_ACCOUNT_FAIL: "NRE accounts can't be auto-verified. Please add a resident Indian savings or current account."
      };

      return sendSuccess(res, {
        verified: false,
        status,
        message: FAILURE_MESSAGES[status] || 'Bank verification failed. Please try again.',
        allowReEntry: true
      });
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
