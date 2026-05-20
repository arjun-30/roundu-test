import axios from 'axios';
import { env } from '../config/env';

const CASHFREE_BASE_URL = env.CASHFREE_BASE_URL || 'https://sandbox.cashfree.com/verification';
const HEADERS = {
  'x-client-id': env.CASHFREE_CLIENT_ID || '',
  'x-client-secret': env.CASHFREE_CLIENT_SECRET || '',
  'content-type': 'application/json',
  'User-Agent': 'RoundU-Backend/1.0 (Node.js)'
};

export class CashfreeService {
  static async createDigilockerRequest(redirectUrl: string, userId: string) {
    const verification_id = `kyc-${userId}-${Date.now()}`;
    const response = await axios.post(
      `${CASHFREE_BASE_URL}/digilocker`,
      {
        verification_id,
        document_requested: ["AADHAAR"],
        redirect_url: redirectUrl,
        user_flow: "signin"
      },
      { headers: HEADERS }
    );
    return response.data;
  }

  static async getDigilockerStatus(verification_id: string) {
    const response = await axios.get(
      `${CASHFREE_BASE_URL}/digilocker?verification_id=${verification_id}`,
      { headers: HEADERS }
    );
    return response.data;
  }

  static async getDigilockerDocument(verification_id: string) {
    const response = await axios.get(
      `${CASHFREE_BASE_URL}/digilocker/document/AADHAAR?verification_id=${verification_id}`,
      { headers: HEADERS }
    );
    return response.data;
  }

  static async verifyPan(pan: string, consent: string = 'Y', reason: string = 'User KYC verification'): Promise<any> {
    throw new Error('Cashfree PAN sync not implemented yet');
  }

  static async verifyBankAsync(ifsc: string, accountNumber: string, narration: string = 'KYC Verification'): Promise<any> {
    throw new Error('Cashfree Bank V2 sync not implemented yet');
  }

  static async getBankVerifyStatus(requestId: string): Promise<any> {
    throw new Error('Cashfree Bank V2 sync not implemented yet');
  }
}
