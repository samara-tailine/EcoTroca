import axios from 'axios';
import { endSession, getSessionSnapshot } from '../auth/session';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const { session } = getSessionSnapshot();
  if (session && config.url !== '/auth/login') {
    if (session.expiresAt <= Date.now()) endSession(true);
    else config.headers.set('Authorization', `Bearer ${session.accessToken}`);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 &&
      error.config?.url !== '/auth/login' && getSessionSnapshot().session) {
      endSession(true);
    }
    return Promise.reject(error);
  },
);