/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { API_BASE_URL } from '@/config/env';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('roundu_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const errorCode = error.response?.data?.code;
      if (errorCode === 'SESSION_EXPIRED' || errorCode === 'UNAUTHENTICATED') {
        // Trigger a custom event that AppContext can listen to for a clean logout
        window.dispatchEvent(new CustomEvent('session_expired', { detail: { reason: error.response?.data?.message || 'Session expired' } }));
      }
    }
    return Promise.reject(error);
  }
);

export const fetchProviderDashboard = async (userId: string) => {
  try {
    const res = await api.get(`/providers/dashboard?userId=${userId}`);
    return res.data;
  } catch (error: any) {
    // Normalize errors so callers don't have to handle thrown AxiosErrors
    const status = error?.response?.status;
    const data = error?.response?.data || { message: error?.message };
    console.error('[API] fetchProviderDashboard error', { status, data });
    return { success: false, error: data, status };
  }
};

export const checkProviderExists = async (userId: string): Promise<{ exists: boolean }> => {
  const res = await api.get(`/providers/exists?userId=${userId}`);
  return res.data;
};

export const fetchCustomerBookings = async (userId: string) => {
  const res = await api.get(`/bookings/customer/${userId}`);
  return res.data;
};

export const fetchProviderBookings = async (providerId: string) => {
  const res = await api.get(`/bookings/provider/${providerId}`);
  return res.data;
};

export const createBooking = async (bookingData: any) => {
  try {
    const res = await api.post('/bookings', bookingData);
    return res.data;
  } catch (error: any) {
    console.error('[API] createBooking error:', error.response?.status, error.response?.data);
    // Return error response in consistent format
    return {
      success: false,
      message: 'Booking failed. Please try again.'
    };
  }
};

export const updateUser = async (userId: string, data: any) => {
  // Use mock fallback in local development if backend might be down
  if (import.meta.env.DEV) {
    try {
      const res = await api.put(`/users/${userId}`, data);
      return res.data;
    } catch (err) {
      console.warn('[API] Backend unreachable, using mock response for updateUser');
      return { success: true, data: { id: userId, ...data } };
    }
  }

  const res = await api.put(`/users/${userId}`, data);
  return res.data;
};

export const registerProvider = async (data: any) => {
  const res = await api.post('/providers/register', data);
  return res.data;
};

export const loadRazorpay = () => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const getChatHistory = async (bookingId: string) => {
  const res = await api.get(`/chat/${bookingId}`);
  return res.data;
};

export const fetchReferralCode = async () => {
  const res = await api.get('/referrals/my-code');
  return res.data;
};

export const applyReferralCode = async (code: string) => {
  const res = await api.post('/referrals/apply', { code });
  return res.data;
};

export const fetchReferralLeaderboard = async () => {
  const res = await api.get('/referrals/leaderboard');
  return res.data;
};

export default api;
