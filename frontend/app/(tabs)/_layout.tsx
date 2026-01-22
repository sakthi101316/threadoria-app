import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { View, ActivityIndicator } from 'react-native';

export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Redirect unauthenticated users to login - using useEffect with router
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Use setTimeout to ensure navigation happens after render cycle
      const timeout = setTimeout(() => {
        router.replace('/');
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading screen while checking auth
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.cream }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // If not authenticated, show loading while redirecting (prevents flash of tabs)
  if (!isAuthenticated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.cream }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.lightGray,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 65,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
        headerStyle: {
          backgroundColor: COLORS.white,
        },
        headerTintColor: COLORS.black,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons 
              name={focused ? "home" : "home-outline"} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Customers',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons 
              name={focused ? "account-group" : "account-group-outline"} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons 
              name={focused ? "clipboard-list" : "clipboard-list-outline"} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="billing"
        options={{
          title: 'Billing',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons 
              name={focused ? "cash-multiple" : "cash"} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <Feather 
              name="settings" 
              size={22} 
              color={color} 
            />
          ),
        }}
      />
    </Tabs>
  );
}
