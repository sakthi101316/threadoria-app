import React, { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { COLORS } from '../src/constants/theme';
import { View, ActivityIndicator } from 'react-native';

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (isLoading) return;

    // Check if on protected route (tabs or any sub-route)
    const inTabsGroup = segments[0] === '(tabs)';
    const inProtectedRoute = inTabsGroup || 
      segments[0] === 'customer' || 
      segments[0] === 'order' ||
      segments[0] === 'add-customer' ||
      segments[0] === 'add-order' ||
      segments[0] === 'add-measurement' ||
      segments[0] === 'edit-measurement' ||
      segments[0] === 'edit-order' ||
      segments[0] === 'search';

    // If not authenticated and on protected route, go to login
    if (!isAuthenticated && inProtectedRoute) {
      if (!hasNavigated.current) {
        hasNavigated.current = true;
        router.replace('/');
        // Reset after navigation completes
        setTimeout(() => { hasNavigated.current = false; }, 500);
      }
    }
  }, [isAuthenticated, isLoading, segments]);

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
