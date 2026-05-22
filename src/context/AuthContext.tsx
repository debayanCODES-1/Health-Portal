"use client";

import React, { createContext, useContext, useState } from 'react';

export type UserRole = 'doctor' | 'patient' | null;

interface AuthState {
  role: UserRole;
  isAuthenticated: boolean;
  abhaId: string | null;
}

interface AuthContextType {
  authState: AuthState;
  login: (role: UserRole, abhaId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    role: null,
    isAuthenticated: false,
    abhaId: null,
  });

  const login = (role: UserRole, abhaId: string) => {
    setAuthState({ role, isAuthenticated: true, abhaId });
  };

  const logout = () => {
    setAuthState({ role: null, isAuthenticated: false, abhaId: null });
  };

  return (
    <AuthContext.Provider value={{ authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
