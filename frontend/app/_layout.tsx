import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/context/AuthContext';
import { COLORS } from '../src/constants/theme';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.cream } }}>
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
    </AuthProvider>
  );
}
