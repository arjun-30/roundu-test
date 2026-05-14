import axios from 'axios';
import { env } from '../config/env';

const SETU_BASE_URL = env.SETU_BASE_URL || 'https://dg-sandbox.setu.co';
const HEADERS = {
  'x-client-id': env.SETU_CLIENT_ID || '3b3d4e41-f540-4dfa-a44f-5fe3ea98a3f4',
  'x-client-secret': env.SETU_CLIENT_SECRET || 'BizBetDlpEgM7DXWXAeWZTeUJtB7AilT',
  'content-type': 'application/json',
  'User-Agent': 'RoundU-Backend/1.0 (Node.js)'
};

const PRODUCT_ID_DIGILOCKER = env.SETU_DIGILOCKER_PRODUCT_ID || '534e1d22-6bcd-4d70-b1f2-867223426bc3';
const PRODUCT_ID_PAN = env.SETU_PAN_PRODUCT_ID || 'c07fd43e-ec8c-4c3b-8a6a-462664417045';
const PRODUCT_ID_BAV = env.SETU_BAV_PRODUCT_ID || 'ebb90d67-5a07-47d6-becc-6339fd93ecf8';

export class SetuService {
  static async createDigilockerRequest(redirectUrl: string) {
    const response = await axios.post(
      `${SETU_BASE_URL}/api/digilocker`,
      { redirectUrl },
      {
        headers: {
          ...HEADERS,
          'x-product-instance-id': PRODUCT_ID_DIGILOCKER
        }
      }
    );
    return response.data; // { id, status, url, validUpto }
  }

  static async getDigilockerStatus(requestId: string) {
    const response = await axios.get(
      `${SETU_BASE_URL}/api/digilocker/${requestId}/aadhaar`,
      {
        headers: {
          ...HEADERS,
          'x-product-instance-id': PRODUCT_ID_DIGILOCKER
        }
      }
    );
    return response.data; // { aadhaar, id, status }
  }

  static async verifyPan(pan: string, consent: string = 'Y', reason: string = 'User KYC verification') {
    const response = await axios.post(
      `${SETU_BASE_URL}/api/verify/pan`,
      { pan, consent, reason },
      {
        headers: {
          ...HEADERS,
          'x-product-instance-id': PRODUCT_ID_PAN
        }
      }
    );
    return response.data; // { data, message, verification, traceId }
  }

  static async verifyBankAsync(ifsc: string, accountNumber: string, narration: string = 'KYC Verification') {
    const response = await axios.post(
      `${SETU_BASE_URL}/api/verify/ban/async`,
      { ifsc, accountNumber, narration },
      {
        headers: {
          ...HEADERS,
          'x-product-instance-id': PRODUCT_ID_BAV
        }
      }
    );
    return response.data; // { id }
  }

  static async getBankVerifyStatus(requestId: string) {
    const response = await axios.get(
      `${SETU_BASE_URL}/api/verify/ban/async/${requestId}`,
      {
        headers: {
          ...HEADERS,
          'x-product-instance-id': PRODUCT_ID_BAV
        }
      }
    );
    return response.data; // { verification, message }
  }
}
