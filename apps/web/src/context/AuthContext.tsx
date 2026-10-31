import { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  refreshAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function parseJwt(token: string): { userId?: string; sub?: string; exp?: number } | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    const storedToken = localStorage.getItem('refreshToken');
    if (!storedToken) {
      return null;
    }

    try {
      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedToken }),
      });

      if (response.ok) {
        const data = await response.json();
        const newAccessToken = data.data.accessToken as string;
        const newRefreshToken = data.data.refreshToken as string;
        setAccessToken(newAccessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        const decoded = parseJwt(newAccessToken);
        const userId = decoded?.userId || decoded?.sub;
        if (userId) {
          setUser((prev) => (prev ? { ...prev, id: userId } : { id: userId }));
        }

        return newAccessToken;
      } else if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('refreshToken');
        setAccessToken(null);
        setUser(null);
        return null;
      }
    } catch (err) {
      console.error('Failed to refresh token', err);
    }
    return null;
  }, []);

  // Proactive automatic token refresh before expiration
  useEffect(() => {
    if (!accessToken) return;

    const decoded = parseJwt(accessToken);
    if (!decoded?.exp) return;

    const expiresInMs = decoded.exp * 1000 - Date.now();
    // Schedule refresh 2 minutes before expiration (or min 10 seconds)
    const refreshDelay = Math.max(10000, expiresInMs - 2 * 60 * 1000);

    const timer = setTimeout(() => {
      void refreshAccessToken();
    }, refreshDelay);

    return () => clearTimeout(timer);
  }, [accessToken, refreshAccessToken]);

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
          const newAccessToken = data.data.accessToken;
          const newRefreshToken = data.data.refreshToken;
          setAccessToken(newAccessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          // Get userId immediately from JWT payload
          const decoded = parseJwt(newAccessToken);
          const userId = decoded?.userId || decoded?.sub;
          if (userId) {
            setUser({ id: userId });
          }

          // Enrich user info via /me endpoint
          try {
            const meResponse = await fetch('/api/v1/auth/me', {
              headers: { Authorization: `Bearer ${newAccessToken}` },
            });
            if (meResponse.ok) {
              const meData = await meResponse.json();
              if (meData.data?.userId) {
                setUser({ id: meData.data.userId });
              }
            }
          } catch {
            // Already set from decoded JWT
          }
        } else if (response.status === 401 || response.status === 403) {
          // Token invalid or revoked
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
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, logout, refreshAccessToken }}>
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
