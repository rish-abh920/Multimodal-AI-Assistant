import axios from 'axios';

// Vite proxy routes /api and /health to http://127.0.0.1:8000
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 120s timeout to accommodate CPU neural model inference
});

// Response interceptor to normalize error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = 'An unexpected error occurred.';
    if (error.response?.data?.detail) {
      if (typeof error.response.data.detail === 'string') {
        message = error.response.data.detail;
      } else if (Array.isArray(error.response.data.detail)) {
        message = error.response.data.detail.map((d) => d.msg || d).join(', ');
      }
    } else if (error.message) {
      message = error.message;
    }
    return Promise.reject(new Error(message));
  }
);

export default apiClient;

