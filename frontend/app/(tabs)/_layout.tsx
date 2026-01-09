import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading]);

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
          fontSize: 11,
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
            <View style={{ alignItems: 'center' }}>
              <MaterialCommunityIcons 
                name={focused ? "home" : "home-outline"} 
                size={26} 
                color={color} 
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Customers',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center' }}>
              <MaterialCommunityIcons 
                name={focused ? "account-group" : "account-group-outline"} 
                size={26} 
                color={color} 
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center' }}>
              <MaterialCommunityIcons 
                name={focused ? "clipboard-list" : "clipboard-list-outline"} 
                size={26} 
                color={color} 
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center' }}>
              <Feather 
                name="settings" 
                size={24} 
                color={color} 
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
