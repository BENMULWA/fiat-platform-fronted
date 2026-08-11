////@ts-nocheck
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../api/client';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  kycStatus?: string;
  permissions?: string[];
  viewAsAdmin?: boolean;
  workspaceId?: string;
  walletAddress?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (displayName: string, email: string, password: string) => Promise<void>;
  requestLoginOtp: (email: string, password: string) => Promise<{ otpSessionId: string; expiresInMinutes: number }>;
  verifyLoginOtp: (otpSessionId: string, otpCode: string) => Promise<void>;
  resendLoginOtp: (otpSessionId: string) => Promise<{ otpSessionId: string; expiresInMinutes: number; cooldownSeconds: number }>;
  requestSignupOtp: (displayName: string, email: string, password: string) => Promise<{ otpSessionId: string; expiresInMinutes: number }>;
  verifySignupOtp: (otpSessionId: string, otpCode: string) => Promise<void>;
  resendSignupOtp: (otpSessionId: string) => Promise<{ otpSessionId: string; expiresInMinutes: number; cooldownSeconds: number }>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
  viewAsAdmin: boolean;
  toggleViewAsAdmin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewAsAdmin, setViewAsAdmin] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const applyAuthenticatedSession = (accessToken: string, userData: any) => {
    // Keep token key aligned with API client interceptor.
    localStorage.setItem('meshex_token', accessToken);
    localStorage.removeItem('Jasiri_token');

    const mappedUser: User = {
      id: userData._id,
      email: userData.email,
      name: userData.displayName,
      role: userData.role || 'retail',
      kycStatus: userData.kycStatus,
      workspaceId: userData.workspaceId,
      walletAddress: userData.walletAddress,
    };

    setUser(mappedUser);
    localStorage.setItem('meshex_user', JSON.stringify(mappedUser));

    if (mappedUser.role !== 'retail' && mappedUser.role !== 'trader') {
      setViewAsAdmin(true);
    } else {
      setViewAsAdmin(false);
    }
  };

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('meshex_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Try to load cached user first for instant UI
      const cachedUser = localStorage.getItem('meshex_user');
      if (cachedUser) {
        try {
          const parsed = JSON.parse(cachedUser);
          setUser(parsed);
          // Only allow admins to be in admin view
          if (parsed.role !== 'retail' && parsed.role !== 'trader') {
            setViewAsAdmin(true);
          }
        } catch (e) { /* ignore */ }
      }

      // 🟢 FIX 1: Added /api prefix to the me endpoint
      const res = await api.get('/api/auth/me');
      const userData = res.data?.user || res.data;

      if (userData) {
        const mappedUser: User = {
          id: userData._id || userData.id || '',
          email: userData.email || '',
          name: userData.displayName || userData.name || '',
          role: userData.role || 'retail',
          kycStatus: userData.kycStatus || 'pending',
          permissions: userData.permissions || [],
          workspaceId: userData.workspaceId,
          walletAddress: userData.walletAddress,
        };

        setUser(mappedUser);
        localStorage.setItem('meshex_user', JSON.stringify(mappedUser));

        // Enforce role security: Only admins can view admin pages
        if (mappedUser.role !== 'retail' && mappedUser.role !== 'trader') {
          setViewAsAdmin(true);
        } else {
          setViewAsAdmin(false);
        }
      }
    } catch (err) {
      // If unauthorized, clear cache
      const cachedUser = localStorage.getItem('meshex_user');
      if (cachedUser) {
        try { setUser(JSON.parse(cachedUser)); } catch (e) { /* ignore */ }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (displayName: string, email: string, password: string) => {
    try {
      // 🟢 FIX 2: Added /api prefix
      const res = await api.post('/api/auth/signup', { displayName, email, password });

      const { access_token, user: userData } = res.data;
      applyAuthenticatedSession(access_token, userData);
    } catch (err: any) {
      throw err;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // 🟢 FIX 3: Added /api prefix
      const res = await api.post('/api/auth/login', { email, password });

      const { access_token, user: userData } = res.data;
      applyAuthenticatedSession(access_token, userData);
    } catch (err: any) {
      throw err;
    }
  };

  const requestSignupOtp = async (displayName: string, email: string, password: string) => {
    try {
      const res = await api.post('/api/auth/signup/request-otp', { displayName, email, password });
      return {
        otpSessionId: res.data.otp_session_id,
        expiresInMinutes: res.data.expires_in_minutes,
      };
    } catch (err: any) {
      throw err;
    }
  };

  const verifySignupOtp = async (otpSessionId: string, otpCode: string) => {
    try {
      const res = await api.post('/api/auth/signup/verify-otp', {
        otp_session_id: otpSessionId,
        otp_code: otpCode,
      });
      const { access_token, user: userData } = res.data;
      applyAuthenticatedSession(access_token, userData);
    } catch (err: any) {
      throw err;
    }
  };

  const resendSignupOtp = async (otpSessionId: string) => {
    try {
      const res = await api.post('/api/auth/signup/resend-otp', {
        otp_session_id: otpSessionId,
      });
      return {
        otpSessionId: res.data.otp_session_id,
        expiresInMinutes: res.data.expires_in_minutes,
        cooldownSeconds: res.data.cooldown_seconds ?? 30,
      };
    } catch (err: any) {
      throw err;
    }
  };

  const requestLoginOtp = async (email: string, password: string) => {
    try {
      const res = await api.post('/api/auth/login/request-otp', { email, password });
      return {
        otpSessionId: res.data.otp_session_id,
        expiresInMinutes: res.data.expires_in_minutes,
      };
    } catch (err: any) {
      throw err;
    }
  };

  const verifyLoginOtp = async (otpSessionId: string, otpCode: string) => {
    try {
      const res = await api.post('/api/auth/login/verify-otp', {
        otp_session_id: otpSessionId,
        otp_code: otpCode,
      });
      const { access_token, user: userData } = res.data;
      applyAuthenticatedSession(access_token, userData);
    } catch (err: any) {
      throw err;
    }
  };

  const resendLoginOtp = async (otpSessionId: string) => {
    try {
      const res = await api.post('/api/auth/login/resend-otp', {
        otp_session_id: otpSessionId,
      });
      return {
        otpSessionId: res.data.otp_session_id,
        expiresInMinutes: res.data.expires_in_minutes,
        cooldownSeconds: res.data.cooldown_seconds ?? 30,
      };
    } catch (err: any) {
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('meshex_token');
    localStorage.removeItem('Jasiri_token');
    localStorage.removeItem('meshex_user');
    setUser(null);
    setViewAsAdmin(false);
    window.location.href = '/';
  };

  const updateUser = (data: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...data };
      localStorage.setItem('meshex_user', JSON.stringify(updated));
      return updated;
    });
  };

  const toggleViewAsAdmin = () => {
    // Ultimate security check: Prevent retail users from switching to admin view
    if (user && (user.role === 'retail' || user.role === 'trader')) {
      setViewAsAdmin(false);
      return;
    }
    setViewAsAdmin(prev => !prev);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      signup,
      requestLoginOtp,
      verifyLoginOtp,
      resendLoginOtp,
      requestSignupOtp,
      verifySignupOtp,
      resendSignupOtp,
      logout,
      updateUser,
      viewAsAdmin,
      toggleViewAsAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}