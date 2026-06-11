import axios from 'axios';
import { env } from '../config/env';
import crypto from 'crypto';

const CASHFREE_BASE_URL = env.CASHFREE_BASE_URL || 'https://sandbox.cashfree.com/verification';

function getHeaders(apiVersion?: string) {
  const headers: Record<string, string> = {
    'x-client-id': env.CASHFREE_CLIENT_ID,
    'x-client-secret': env.CASHFREE_CLIENT_SECRET,
    'content-type': 'application/json',
    'User-Agent': 'RoundU-Backend/1.0 (Node.js)'
  };

  if (apiVersion) {
    headers['x-api-version'] = apiVersion;
  }

  if (env.CASHFREE_PUBLIC_KEY) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const payload = `${env.CASHFREE_CLIENT_ID}.${timestamp}`;
    
    try {
      const publicKey = env.CASHFREE_PUBLIC_KEY.replace(/\\n/g, '\n');
      const signature = crypto.publicEncrypt(
        {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        },
        Buffer.from(payload)
      ).toString('base64');
      
      headers['x-cf-signature'] = signature;
    } catch (err: any) {
      console.error('[CashfreeService] Failed to generate RSA signature:', err);
      throw new Error(`RSA Signature generation failed: ${err.message}`);
    }
  }

  return headers;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export class CashfreeService {

  // ─── DigiLocker ───────────────────────────────────────────────────────────

  // Check if user has DigiLocker account → determines user_flow
  // Uses phone because Aadhaar not available at this stage (acceptable tradeoff)
  static async checkDigilockerAccount(phone: string, checkVerificationId: string) {
    const response = await axios.post(
      `${CASHFREE_BASE_URL}/digilocker/verify-account`,
      { verification_id: checkVerificationId, mobile_number: phone },
      { headers: getHeaders() }
    );
    return response.data; // { status: 'ACCOUNT_EXISTS' | 'ACCOUNT_NOT_FOUND' }
  }

  // Create DigiLocker redirect URL
  static async createDigilockerRequest(
    redirectUrl: string,
    verificationId: string,
    userFlow: 'signin' | 'signup'
  ) {
    const response = await axios.post(
      `${CASHFREE_BASE_URL}/digilocker`,
      {
        verification_id: verificationId,
        document_requested: ['AADHAAR'],
        redirect_url: redirectUrl,
        user_flow: userFlow
      },
      { headers: getHeaders() }
    );
    return response.data; // { url, status, verification_id, reference_id }
  }

  // Poll verification status
  static async getDigilockerStatus(verificationId: string) {
    const response = await axios.get(
      `${CASHFREE_BASE_URL}/digilocker`,
      { headers: getHeaders(), params: { verification_id: verificationId } }
    );
    return response.data;
    // { status, user_details: { eaadhaar: 'Y'|'N', name, dob, ... } }
  }

  // Fetch Aadhaar document — only call if eaadhaar === 'Y'
  // Gap 4 fix: retry up to 3x on 202 validation_pending
  static async getDigilockerDocument(verificationId: string, documentType = 'AADHAAR') {
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const response = await axios.get(
        `${CASHFREE_BASE_URL}/digilocker/document/${documentType}`,
        { headers: getHeaders(), params: { verification_id: verificationId } }
      );
      const data = response.data;
      if (data.status === 'SUCCESS') return data;
      // 202 validation_pending — wait and retry
      if (response.status === 202 || data.code === 'validation_pending') {
        if (attempt < MAX_ATTEMPTS) {
          await sleep(3000);
          continue;
        }
      }
      // Any other non-SUCCESS (AADHAAR_NOT_LINKED, etc.) — return as-is
      return data;
    }
  }

  // ─── PAN ──────────────────────────────────────────────────────────────────

  // Gap 7 fix: x-api-version required for aadhaar_seeding_status field
  static async verifyPan(pan: string, name?: string) {
    const response = await axios.post(
      `${CASHFREE_BASE_URL}/pan`,
      { pan, ...(name ? { name } : {}) },
      { headers: getHeaders('2022-10-26') }
    );
    return response.data;
    // { valid, registered_name, pan_status, reference_id, name_match_result,
    //   name_match_score, type, aadhaar_seeding_status, message }
  }

  // ─── BAV ──────────────────────────────────────────────────────────────────

  // Gap 17 note: accountNumber is first, ifsc second — matches Cashfree payload order
  // Body correctly maps: bank_account → accountNumber, ifsc → ifsc
  static async verifyBankSync(accountNumber: string, ifsc: string, name?: string) {
    const response = await axios.post(
      `${CASHFREE_BASE_URL}/bank-account/sync`,
      { bank_account: accountNumber, ifsc, ...(name ? { name } : {}) },
      { headers: getHeaders() }
    );
    return response.data;
    // { account_status, account_status_code, name_at_bank, bank_name, reference_id, utr }
  }

  // Gap 10+11+12 transient retry logic — non-retryable errors thrown immediately
  // Gap 14: penny drop queue deferred to next iteration
  static async verifyBankWithRetry(
    accountNumber: string,
    ifsc: string,
    name?: string,
    attempt = 1
  ): Promise<any> {
    const TRANSIENT_CODES = [
      'failed_at_bank', 'npci_unavailable', 'connection_timeout',
      'source_bank_declined', 'bene_bank_declined', 'benficiary_bank_offline', 'imps_mode_fail'
    ];

    try {
      return await CashfreeService.verifyBankSync(accountNumber, ifsc, name);
    } catch (err: any) {
      const status = err?.response?.status;
      const code = err?.response?.data?.code;

      if (attempt >= 2) throw err; // retries exhausted — controller handles

      if (status === 422 && TRANSIENT_CODES.includes(code)) {
        await sleep(3000 + Math.random() * 2000); // 3–5s jitter
        return CashfreeService.verifyBankWithRetry(accountNumber, ifsc, name, attempt + 1);
      }
      if (status === 422 && code === 'verification_already_under_process') {
        await sleep(5000);
        return CashfreeService.verifyBankWithRetry(accountNumber, ifsc, name, attempt + 1);
      }
      if (status === 500 || status === 502) {
        await sleep(2000);
        return CashfreeService.verifyBankWithRetry(accountNumber, ifsc, name, attempt + 1);
      }

      throw err; // non-retryable (fraud, balance, 401, 403, 429) — rethrow
    }
  }
}
