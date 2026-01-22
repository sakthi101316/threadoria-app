import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { COLORS } from '../src/constants/theme';

function AuthStack() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.cream } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="register" />
    </Stack>
  );
}

function AppStack() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.cream } }}>
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
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

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
      {isAuthenticated ? <AppStack /> : <AuthStack />}
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
