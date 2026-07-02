import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  user: any | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  signup: (displayName: string, email: string, password?: string) => Promise<void>;
  logout: () => void;
  viewAsAdmin: boolean;
  toggleViewAsAdmin: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => { },
  signup: async () => { },
  logout: () => { },
  viewAsAdmin: false,
  toggleViewAsAdmin: () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
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
        console.error("Failed to parse user session");
      }
    }
    // Stop the loading spinner in App.tsx once we've checked storage
    setIsLoading(false);
  }, []);

  const login = async (email: string, password?: string) => {
    setIsLoading(true);

    // Simulate a secure API call to your backend
    await new Promise(res => setTimeout(res, 800));

    // For demonstration: any email containing 'admin' gets admin privileges
    const role = email.toLowerCase().includes('admin') ? 'admin' : 'trader';

    const loggedInUser = {
      email,
      name: email.split('@')[0],
      role,
      workspaceId: `ws_${Math.random().toString(36).substring(2, 9)}`
    };

    setUser(loggedInUser);
    setViewAsAdmin(loggedInUser.role === 'admin');

    localStorage.setItem('meshex_user', JSON.stringify(loggedInUser));
    localStorage.setItem('meshex_token', 'mock_jwt_token_123456789');

    setIsLoading(false);
  };

  const signup = async (displayName: string, email: string, password?: string) => {
    setIsLoading(true);

    // Simulate API call to register user
    await new Promise(res => setTimeout(res, 800));

    const role = email.toLowerCase().includes('admin') ? 'admin' : 'trader';

    const newUser = {
      email,
      name: displayName,
      role,
      workspaceId: `ws_${Math.random().toString(36).substring(2, 9)}`
    };

    setUser(newUser);
    setViewAsAdmin(newUser.role === 'admin');

    localStorage.setItem('meshex_user', JSON.stringify(newUser));
    localStorage.setItem('meshex_token', 'mock_jwt_token_123456789');

    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
    setViewAsAdmin(false);
    localStorage.removeItem('meshex_user');
    localStorage.removeItem('meshex_token');

    // Optional: Force a hard reload to clear any residual state from memory
    // window.location.href = '/'; 
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      signup,
      logout,
      viewAsAdmin,
      toggleViewAsAdmin: () => setViewAsAdmin(!viewAsAdmin)
    }}>
      {children}
    </AuthContext.Provider>
  );
};