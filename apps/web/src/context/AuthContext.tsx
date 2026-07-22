import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface User {
  id: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Attempt to restore session on mount
    const restoreSession = async () => {
      const storedToken = localStorage.getItem('refreshToken');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/v1/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: storedToken }),
        });

        if (response.ok) {
          const data = await response.json();
          setAccessToken(data.data.accessToken);
          localStorage.setItem('refreshToken', data.data.refreshToken);
          
          // Fetch current user
          const meResponse = await fetch('/api/v1/auth/me', {
            headers: { 'Authorization': `Bearer ${data.data.accessToken}` }
          });
          if (meResponse.ok) {
            const meData = await meResponse.json();
            setUser({ id: meData.data.userId });
          }
        } else {
          // Token invalid
          localStorage.removeItem('refreshToken');
        }
      } catch (err) {
        console.error('Failed to restore session', err);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = (newAccessToken: string, newRefreshToken: string, newUser: User) => {
    setAccessToken(newAccessToken);
    setUser(newUser);
    localStorage.setItem('refreshToken', newRefreshToken);
  };

  const logout = async () => {
    const storedToken = localStorage.getItem('refreshToken');
    if (storedToken) {
      try {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: storedToken }),
        });
      } catch (err) {
        console.error('Logout failed', err);
      }
    }
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem('refreshToken');
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, logout }}>
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
