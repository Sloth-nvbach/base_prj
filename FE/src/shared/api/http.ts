import axios from 'axios';
import { tokenStore } from '@/modules/auth/store/token.store';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5003/api';

export const http = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000
});

http.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status as number | undefined;
    if (status === 401) {
      tokenStore.clear();
      if (window.location.pathname !== '/logout') {
        window.location.href = '/logout';
      }
    }

    return Promise.reject(error);
  }
);
