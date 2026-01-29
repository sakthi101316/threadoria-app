import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const IDLE_TIMEOUT = 60 * 60 * 1000; // 1 hour in milliseconds

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
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const lastActiveTime = useRef<number>(Date.now());
  const idleTimer = useRef<NodeJS.Timeout | null>(null);

  // Check for idle timeout
  const checkIdleTimeout = useCallback(async () => {
    const now = Date.now();
    if (now - lastActiveTime.current > IDLE_TIMEOUT && isAuthenticated) {
      console.log('AUTO-LOGOUT: Idle timeout exceeded');
      await AsyncStorage.multiRemove(['auth_token', 'user_data']);
      setUser(null);
      setIsAuthenticated(false);
    }
  }, [isAuthenticated]);

  // Update last active time on user interaction
  const updateActivity = useCallback(() => {
    lastActiveTime.current = Date.now();
  }, []);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App going to background - clear auth for security
        console.log('APP BACKGROUND: Clearing auth');
        await AsyncStorage.multiRemove(['auth_token', 'user_data']);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // Set up idle timer
  useEffect(() => {
    if (isAuthenticated) {
      idleTimer.current = setInterval(checkIdleTimeout, 60000); // Check every minute
    }
    return () => {
      if (idleTimer.current) {
        clearInterval(idleTimer.current);
      }
    };
  }, [isAuthenticated, checkIdleTimeout]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userData = await AsyncStorage.getItem('user_data');
      
      if (token && userData) {
        setUser(JSON.parse(userData));
        setIsAuthenticated(true);
        lastActiveTime.current = Date.now();
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
        body: JSON.stringify({ email: phone, pin: pin }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        const userData: User = {
          user_id: data.user_id,
          username: data.username || phone,
          boutique_name: data.boutique_name || 'My Boutique',
        };
        await AsyncStorage.setItem('auth_token', data.token || 'authenticated');
        await AsyncStorage.setItem('user_data', JSON.stringify(userData));
        setUser(userData);
        setIsAuthenticated(true);
        lastActiveTime.current = Date.now();
        return { success: true, message: 'Login successful' };
      } else {
        return { success: false, message: data.detail || data.message || 'Invalid credentials' };
      }
    } catch (error: any) {
      return { success: false, message: error.message || 'Login failed' };
    }
  };

  const logout = useCallback(async () => {
    console.log('LOGOUT: Starting logout process');
    await AsyncStorage.multiRemove(['auth_token', 'user_data']);
    console.log('LOGOUT: Storage cleared');
    setUser(null);
    setIsAuthenticated(false);
    console.log('LOGOUT: State updated');
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
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
