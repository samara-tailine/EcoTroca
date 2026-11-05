import { createContext, useContext } from 'react';
import type { AuthSession } from './auth.types';

interface AuthContextValue {
  session: AuthSession | null;
  expired: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return context;
}