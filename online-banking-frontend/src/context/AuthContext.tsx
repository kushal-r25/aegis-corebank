import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User;
  role: UserRole;
  switchRole: (newRole: UserRole) => void;
  sessionTimeout: string;
  refreshSession: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(() => api.auth.getCurrentUser());
  const [secondsRemaining, setSecondsRemaining] = useState(888); // ~14:48 min

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimeout = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const switchRole = (newRole: UserRole) => {
    const updated = api.auth.switchRole(newRole);
    setUser(updated);
    setSecondsRemaining(900);
  };

  const refreshSession = () => {
    setSecondsRemaining(900);
  };

  const logout = () => {
    // switch to customer or reset
    switchRole('CUSTOMER');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user.role,
        switchRole,
        sessionTimeout: formatTimeout(secondsRemaining),
        refreshSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
