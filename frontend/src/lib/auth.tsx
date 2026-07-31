'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { getMe, signIn as apiSignIn, getCognitoLoginUrl, exchangeCognitoCode } from './api';

export interface AuthUser {
  id: string;
  email: string;
  display_name: string;
  role: 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN';
  avatar_url?: string;
  phone?: string;
  marketing_consent?: boolean;
  category_preferences?: string[];
  city_preference?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  loginWithCognito: () => Promise<void>;
  handleCognitoCallback: (code: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  signIn: async () => {},
  loginWithCognito: async () => {},
  handleCognitoCallback: async () => {},
  logout: () => {},
  isAdmin: false,
  isSuperAdmin: false,
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount via httpOnly refresh-token cookie
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const sessionRes = await fetch('/api/auth/session');
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          if (sessionData.success && sessionData.data?.id_token) {
            const idToken = sessionData.data.id_token as string;
            const userRes = await getMe(idToken);
            setUser(userRes.data);
            setToken(idToken);
          }
        }
      } catch {
        // No active session — user will need to sign in
      }
      setLoading(false);
    };
    restoreSession();
  }, []);

  async function establishSession(refreshToken: string) {
    const sessionRes = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!sessionRes.ok) {
      setUser(null);
      setToken(null);
      throw new Error('Failed to establish session. Please try signing in again.');
    }
  }

  const signIn = async (email: string, password: string) => {
    const res = await apiSignIn(email, password);
    const { id_token, refresh_token, user: userData } = res.data;
    setUser(userData);
    setToken(id_token);
    if (refresh_token) await establishSession(refresh_token);
  };

  const loginWithCognito = async () => {
    const res = await getCognitoLoginUrl();
    window.location.href = res.data.loginUrl;
  };

  const handleCognitoCallback = useCallback(async (code: string) => {
    const redirectUri = `${window.location.origin}/auth/callback`;
    const res = await exchangeCognitoCode(code, redirectUri);
    const { id_token, refresh_token, user: userData } = res.data;
    setUser(userData);
    setToken(id_token);
    if (refresh_token) await establishSession(refresh_token);
  }, []);

  const logout = () => {
    setUser(null);
    setToken(null);
    fetch('/api/auth/session', { method: 'DELETE', keepalive: true }).catch(() => {});
    window.location.href = '/';
  };

  const isAdmin = user ? user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' : false;
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await getMe(token);
      if (res.data) setUser(res.data as AuthUser);
    } catch {
      // silently fail
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        signIn,
        loginWithCognito,
        handleCognitoCallback,
        logout,
        isAdmin,
        isSuperAdmin,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
