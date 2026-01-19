import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useSegments } from 'expo-router';

interface User {
  user_id: string;
  username: string;
  boutique_name: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
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
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, signIn, logout }}>
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
