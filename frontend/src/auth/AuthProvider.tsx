import { useEffect, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { api } from '../services/api';
import { AuthContext } from './AuthContext';
import type { LoginResponse } from './auth.types';
import { endSession, getSessionSnapshot, startSession, subscribeSession } from './session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const { session, expired } = useSyncExternalStore(subscribeSession, getSessionSnapshot);

  useEffect(() => {
    if (!session) return;
    const checkExpiry = () => {
      if (session.expiresAt <= Date.now()) endSession(true);
    };
    const timer = window.setTimeout(checkExpiry, Math.max(0, session.expiresAt - Date.now()));
    window.addEventListener('focus', checkExpiry);
    document.addEventListener('visibilitychange', checkExpiry);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', checkExpiry);
      document.removeEventListener('visibilitychange', checkExpiry);
    };
  }, [session]);

  async function login(email: string, password: string) {
    const { data } = await api.post<LoginResponse>('/auth/login', { email: email.trim().toLowerCase(), password });
    startSession(data);
  }

  return (
    <AuthContext.Provider value={{ session, expired, login, logout: () => endSession() }}>
      {children}
    </AuthContext.Provider>
  );
}