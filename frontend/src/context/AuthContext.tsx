import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import client from '../api/client';
import { User } from '../types';

interface AuthCtx {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: 'ADMIN' | 'USER') => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem('token');
    const u = localStorage.getItem('user');
    if (t && u) { setToken(t); setUser(JSON.parse(u)); }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await client.post('/login', { email, password });
    const { token: t } = res.data;
    const payload = JSON.parse(atob(t.split('.')[1]));
    const u: User = { id: payload.id, name: email.split('@')[0], email: payload.email, role: payload.role };
    setToken(t); setUser(u);
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify(u));
  };

  const register = async (name: string, email: string, password: string, role: 'ADMIN' | 'USER') => {
    await client.post('/register', { name, email, password, role });
  };

  const logout = () => {
    setToken(null); setUser(null);
    localStorage.clear();
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, isAdmin: user?.role === 'ADMIN', login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
