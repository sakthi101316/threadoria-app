import React, { useEffect } from 'react';
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

  useEffect(() => {
    if (isLoading) return; // Wait for auth check to complete

    const inAuthGroup = segments[0] === '(tabs)';
    const isProtectedRoute = inAuthGroup || segments[0]?.startsWith('customer') || 
                             segments[0]?.startsWith('order') || segments[0]?.startsWith('add-') ||
                             segments[0]?.startsWith('edit-') || segments[0] === 'search';

    if (!isAuthenticated && isProtectedRoute) {
      // User is not authenticated but trying to access protected route
      router.replace('/');
    } else if (isAuthenticated && !inAuthGroup && segments[0] !== 'customer' && 
               segments[0] !== 'order' && segments[0] !== 'add-customer' && 
               segments[0] !== 'add-order' && segments[0] !== 'add-measurement' &&
               segments[0] !== 'edit-measurement' && segments[0] !== 'edit-order' &&
               segments[0] !== 'search') {
      // User is authenticated but on login/register page - redirect to home
      if (segments[0] === 'index' || segments.length === 0 || segments[0] === 'register') {
        router.replace('/(tabs)');
      }
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
