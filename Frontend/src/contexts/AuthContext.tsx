import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, UserRole } from '@/types/parking';
import { request } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<{ requiresVerification: boolean; message: string }>;
  register: (name: string, email: string, password: string, vehicleNumber: string) => Promise<{ requiresVerification: boolean; email: string; message: string }>;
  verifyEmailOtp: (email: string, otp: string) => Promise<void>;
  resendEmailOtp: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, token: string, newPassword: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('parkely_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadCurrentUser = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const data = await request<{ user: User }>('/auth/me', { token });
        setUser(data.user);
      } catch {
        localStorage.removeItem('parkely_token');
        setToken(null);
        setUser(null);
      }
      setIsLoading(false);
    };

    void loadCurrentUser();
  }, [token]);

  const persistAuth = (accessToken: string, currentUser: User) => {
    localStorage.setItem('parkely_token', accessToken);
    setToken(accessToken);
    setUser(currentUser);
  };

  const login = async (email: string, password: string, role: UserRole) => {
    const data = await request<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, role }),
    });
    persistAuth(data.access_token, data.user);
    return { requiresVerification: false, message: 'Signed in successfully' };
  };

  const register = async (name: string, email: string, password: string, vehicleNumber: string) => {
    const data = await request<{ message: string; otp_sent: boolean; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, vehicle_number: vehicleNumber }),
    });
    return { requiresVerification: true, email, message: data.message };
  };

  const verifyEmailOtp = async (email: string, otp: string) => {
    const data = await request<{ access_token: string; user: User }>('/auth/verify-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
    persistAuth(data.access_token, data.user);
  };

  const resendEmailOtp = async (email: string) => {
    await request('/auth/resend-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  };

  const forgotPassword = async (email: string) => {
    await request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  };

  const resetPassword = async (email: string, tokenValue: string, newPassword: string) => {
    await request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, token: tokenValue, new_password: newPassword }),
    });
  };

  const logout = () => {
    localStorage.removeItem('parkely_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, verifyEmailOtp, resendEmailOtp, forgotPassword, resetPassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
