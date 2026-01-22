import React, { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { COLORS } from '../src/constants/theme';

// This component handles auth-based navigation
function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const previousAuthState = useRef<boolean | null>(null);

  useEffect(() => {
    if (isLoading) return;

    // LOGOUT DETECTION: If user was authenticated and now is not -> redirect to login
    if (previousAuthState.current === true && isAuthenticated === false) {
      console.log('LOGOUT DETECTED - Redirecting to login');
      router.replace('/');
      previousAuthState.current = isAuthenticated;
      return;
    }

    // Update previous auth state
    previousAuthState.current = isAuthenticated;

    // Determine if current route is login/register (public routes)
    const onPublicRoute = segments.length === 0 || segments[0] === 'index' || segments[0] === 'register' || segments[0] === undefined;

    // NOT AUTHENTICATED: If on any protected route, go to login
    if (!isAuthenticated && !onPublicRoute) {
      console.log('NOT AUTHENTICATED on protected route - Redirecting to login');
      router.replace('/');
      return;
    }

    // AUTHENTICATED: If on login/register page, go to home
    if (isAuthenticated && onPublicRoute) {
      console.log('AUTHENTICATED on public route - Redirecting to home');
      router.replace('/(tabs)');
      return;
    }
  }, [isAuthenticated, isLoading, segments]);

  // Show loading screen while checking auth
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.cream }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.cream },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="customer/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="order/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="add-customer" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add-order" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add-measurement" options={{ presentation: 'modal' }} />
        <Stack.Screen name="edit-measurement" options={{ presentation: 'modal' }} />
        <Stack.Screen name="edit-order" options={{ presentation: 'modal' }} />
        <Stack.Screen name="search" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
