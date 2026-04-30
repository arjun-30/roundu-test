import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://roundu-app.up.railway.app';

const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
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
