import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useSegments } from 'expo-router';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface User {
  user_id: string;
  username: string;
  boutique_name: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone: string, pin: string) => Promise<{ success: boolean; message: string }>;
  signIn: (token: string, userData: User) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  // Check for existing auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Handle navigation based on auth state
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(tabs)';
    const inProtectedRoute = ['customer', 'order', 'add-customer', 'add-order', 'add-measurement', 'edit-measurement', 'edit-order', 'search'].includes(segments[0] as string);

    if (!isAuthenticated && (inAuthGroup || inProtectedRoute)) {
      // Not authenticated but trying to access protected route
      router.replace('/');
    } else if (isAuthenticated && segments[0] !== '(tabs)' && segments[0] !== 'customer' && segments[0] !== 'order' && segments[0] !== 'add-customer' && segments[0] !== 'add-order' && segments[0] !== 'add-measurement' && segments[0] !== 'edit-measurement' && segments[0] !== 'edit-order' && segments[0] !== 'search' && segments[0] !== 'register') {
      // Authenticated but on login page
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userData = await AsyncStorage.getItem('user_data');
      
      if (token && userData) {
        setUser(JSON.parse(userData));
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (phone: string, pin: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pin }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        const userData: User = {
          user_id: data.user_id,
          username: data.username || phone,
          boutique_name: data.boutique_name || 'My Boutique',
        };
        await signIn(data.token || 'authenticated', userData);
        return { success: true, message: 'Login successful' };
      } else {
        return { success: false, message: data.detail || data.message || 'Invalid credentials' };
      }
    } catch (error: any) {
      return { success: false, message: error.message || 'Login failed' };
    }
  };

  const signIn = async (token: string, userData: User) => {
    await AsyncStorage.setItem('auth_token', token);
    await AsyncStorage.setItem('user_data', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    // Clear storage synchronously first
    AsyncStorage.multiRemove(['auth_token', 'user_data']).then(() => {
      console.log('Storage cleared');
    });
    // Update state immediately
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, signIn, logout }}>
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
