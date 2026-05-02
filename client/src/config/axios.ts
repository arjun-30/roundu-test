import axios from "axios";
import { toast } from "sonner";
import { API_BASE_URL } from "@/config/env";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15s timeout
});

// Request Interceptor: Add Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("roundu_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Error Handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || error.response?.data?.message || "Something went wrong";
    
    if (error.response?.status === 401) {
      // Unauthorized: Clear token and redirect if needed
      localStorage.removeItem("roundu_token");
      // Don't toast on every 401 if it's a silent check
    } else if (error.response?.status === 500) {
      toast.error("Server error. Please try again later.");
    } else if (error.code === "ECONNABORTED") {
      toast.error("Request timed out. Please check your internet.");
    } else if (!error.response) {
      toast.error("Network error. Please check your connection.");
    }

    return Promise.reject(error);
  }
);

export default api;
