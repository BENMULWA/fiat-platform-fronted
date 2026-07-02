// @ts-nocheck
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'trader';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  viewAsAdmin: boolean;
  login: (email: string, _password?: string) => Promise<void>;
  signup: (displayName: string, email: string, _password?: string) => Promise<void>;
  logout: () => void;
  toggleViewAsAdmin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewAsAdmin, setViewAsAdmin] = useState(false);

  useEffect(() => {
    // Check local storage for an existing user session on mount
    const storedUser = localStorage.getItem('meshex_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        // Default to admin view if their role is admin
        setViewAsAdmin(parsedUser.role === 'admin');
      } catch (e) {
        console.error("Failed to parse user session", e);
      }
    }
    // Stop the loading spinner in App.tsx once we've checked storage
    setIsLoading(false);
  }, []);

  const login = async (email: string, _password?: string) => {
    setIsLoading(true);

    // Simulate a secure API call to your backend
    await new Promise(res => setTimeout(res, 800));

    // For demonstration: any email containing 'admin' gets admin privileges
    const role = email.toLowerCase().includes('admin') ? 'admin' : 'trader';

    const loggedInUser: User = {
      id: `usr_${Math.random().toString(36).substr(2, 9)}`,
      name: email.split('@')[0],
      email,
      role,
    };

    setUser(loggedInUser);
    setViewAsAdmin(role === 'admin');

    localStorage.setItem('meshex_user', JSON.stringify(loggedInUser));
    localStorage.setItem('meshex_token', 'mock_jwt_token_123456789');

    setIsLoading(false);
  };

  const signup = async (displayName: string, email: string, _password?: string) => {
    setIsLoading(true);

    // Simulate API call to register user
    await new Promise(res => setTimeout(res, 800));

    const role = email.toLowerCase().includes('admin') ? 'admin' : 'trader';

    const newUser: User = {
      id: `usr_${Math.random().toString(36).substr(2, 9)}`,
      name: displayName,
      email,
      role,
    };

    setUser(newUser);
    setViewAsAdmin(role === 'admin');

    localStorage.setItem('meshex_user', JSON.stringify(newUser));
    localStorage.setItem('meshex_token', 'mock_jwt_token_123456789');

    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
    setViewAsAdmin(false);
    localStorage.removeItem('meshex_user');
    localStorage.removeItem('meshex_token');
  };

  const toggleViewAsAdmin = () => {
    // SECURITY LOCK REMOVED: Anyone can toggle between Retail and Admin modes for the demo!
    setViewAsAdmin(prev => !prev);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, viewAsAdmin, login, signup, logout, toggleViewAsAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}