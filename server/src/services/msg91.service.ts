import axios from 'axios';
import { env } from '../config/env';

export const sendOTP = async (mobile: string, otp?: string) => {
  if (!env.MSG91_AUTH_KEY) {
    console.warn('MSG91_AUTH_KEY not set, skipping SMS send');
    return { success: true, message: 'Mock success' };
  }

  try {
    const response = await axios.post('https://api.msg91.com/api/v5/otp', null, {
      params: {
        template_id: env.MSG91_TEMPLATE_ID || '64049870d6fc0538a8346613', // Placeholder template
        mobile: `91${mobile}`,
        authkey: env.MSG91_AUTH_KEY,
        sender: env.MSG91_SENDER_ID || 'ROUNDU',
        otp: otp // Optional custom OTP
      }
    });
    console.log('MSG91 Response:', JSON.stringify(response.data));
    return response.data;
  } catch (error: any) {
    console.error('MSG91 Error:', error.response?.data || error.message);
    throw new Error('Failed to send OTP');
  }
};

export const verifyWidgetToken = async (accessToken: string) => {
  if (!env.MSG91_AUTH_KEY) {
    throw new Error('MSG91_AUTH_KEY not set');
  }

  try {
    const response = await axios.post('https://control.msg91.com/api/v5/widget/verifyAccessToken', {
      authkey: env.MSG91_AUTH_KEY,
      "access-token": accessToken
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (error: any) {
    console.error('MSG91 Widget Verify Error:', error.response?.data || error.message);
    throw new Error('Widget Token Verification Failed');
  }
};
