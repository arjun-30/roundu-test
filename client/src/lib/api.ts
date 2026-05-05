import axios from 'axios';
import { API_BASE_URL } from '@/config/env';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const fetchProviderDashboard = async (userId: string) => {
  const res = await api.get(`/providers/dashboard?userId=${userId}`);
  return res.data;
};

export const fetchCustomerBookings = async (userId: string) => {
  const res = await api.get(`/bookings/customer/${userId}`);
  return res.data;
};

export const createBooking = async (bookingData: any) => {
  const res = await api.post('/bookings', bookingData);
  return res.data;
};

export const updateUser = async (userId: string, data: any) => {
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

export default api;
