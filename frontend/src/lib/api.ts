import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  config.headers['X-Requested-With'] = 'XMLHttpRequest';
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const { isInitialized, clearUser } = useAuthStore.getState();
      const onAuthPage = ['/login', '/register'].includes(window.location.pathname);
      if (isInitialized && !onAuthPage) {
        clearUser();
        sessionStorage.setItem('sessionExpired', '1');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);
