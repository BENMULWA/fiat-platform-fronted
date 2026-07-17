// @ts-nocheck
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, getRetailWallet, getRampHistory } from '../api/client';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'trader';
  kycStatus?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  viewAsAdmin: boolean;
  login: (email: string, _password?: string) => Promise<void>;
  signup: (displayName: string, email: string, _password?: string) => Promise<void>;
  logout: () => void;
  toggleViewAsAdmin: () => void;
  updateUser: (updates: Partial<User>) => void; // <-- Added this!
  walletBalances?: any;
  rampHistory?: any[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewAsAdmin, setViewAsAdmin] = useState(false);
  const [walletBalances, setWalletBalances] = useState<any>({});
  const [rampHistory, setRampHistory] = useState<any[]>([]);

  useEffect(() => {
    const storedUser = localStorage.getItem('meshex_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setViewAsAdmin(parsedUser.role === 'admin');
      } catch (e) {
        console.error("Failed to parse user session", e);
      }
    }
    setIsLoading(false);
  }, []);

  // --- ADDED THIS FUNCTION TO UPDATE KYC STATUS GLOBALLY ---
  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('meshex_user', JSON.stringify(updatedUser));
    }
  };

  const login = async (email: string, _password?: string) => {
    setIsLoading(true);
    try {
      const res = await api.post('/api/auth/login', { email, password: _password });
      const token = res.data.access_token;
      const userObj = res.data.user;

      localStorage.setItem('meshex_token', token);
      const mappedUser: any = { id: userObj._id || userObj.id, name: userObj.displayName || userObj.name, email: userObj.email, role: userObj.role || 'trader', kycStatus: userObj.kycStatus || 'pending' };
      setUser(mappedUser);
      setViewAsAdmin(mappedUser.role === 'admin');
      localStorage.setItem('meshex_user', JSON.stringify(mappedUser));

      try {
        const w = await getRetailWallet();
        setWalletBalances(w.data.balances || {});
      } catch (e) { }
      try {
        const h = await getRampHistory();
        setRampHistory(h.data.entries || []);
      } catch (e) { }
    } catch (err) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (displayName: string, email: string, _password?: string) => {
    setIsLoading(true);
    try {
      const res = await api.post('/api/auth/signup', { email, password: _password, displayName });
      const token = res.data.access_token;
      const userObj = res.data.user;

      localStorage.setItem('meshex_token', token);
      const mappedUser: any = { id: userObj._id || userObj.id, name: userObj.displayName || userObj.name, email: userObj.email, role: userObj.role || 'trader', kycStatus: userObj.kycStatus || 'pending' };
      setUser(mappedUser);
      setViewAsAdmin(mappedUser.role === 'admin');
      localStorage.setItem('meshex_user', JSON.stringify(mappedUser));

      try {
        const w = await getRetailWallet();
        setWalletBalances(w.data.balances || {});
      } catch (e) { }
    } catch (err) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setViewAsAdmin(false);
    localStorage.removeItem('meshex_user');
    localStorage.removeItem('meshex_token');
  };

  const toggleViewAsAdmin = () => setViewAsAdmin(prev => !prev);

  return (
    <AuthContext.Provider value={{ user, isLoading, viewAsAdmin, login, signup, logout, toggleViewAsAdmin, updateUser, walletBalances, rampHistory }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}