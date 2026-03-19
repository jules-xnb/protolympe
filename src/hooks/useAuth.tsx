import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { api, setToken, clearToken } from '@/lib/api-client';

export interface AppUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get<{ user: AppUser }>('/api/auth/me')
      .then(({ user }) => {
        setUser(user);
      })
      .catch(() => {
        clearToken();
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const data = await api.post<{ token: string; user: AppUser }>('/api/auth/signin', {
        email,
        password,
      });
      setToken(data.token);
      setUser(data.user);
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Erreur de connexion') };
    }
  };

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
    try {
      const data = await api.post<{ token: string; user: AppUser }>('/api/auth/signup', {
        email,
        password,
        firstName,
        lastName,
      });
      setToken(data.token);
      setUser(data.user);
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error("Erreur d'inscription") };
    }
  };

  const signOut = async () => {
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
