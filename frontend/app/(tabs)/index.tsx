import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, APP_CONFIG } from '../../src/constants/theme';
import { GlassCard } from '../../src/components/GlassCard';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';

const { width } = Dimensions.get('window');

interface DashboardStats {
  total_customers: number;
  pending_orders: number;
  delivery_today: number;
  delivery_in_2_days: number;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    total_customers: 0,
    pending_orders: 0,
    delivery_today: 0,
    delivery_in_2_days: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    // Pulse animation for logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await api.getDashboardStats(user?.user_id);
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  }, []);

 

  const StatCard = ({ title, value, icon, IconComponent, color, gradient, onPress }: { 
    title: string; 
    value: number; 
    icon: string; 
    IconComponent: any;
    color: string;
    gradient: string[];
    onPress?: () => void;
  }) => (
    <TouchableOpacity activeOpacity={0.8} style={styles.statCardWrapper} onPress={onPress}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statCard}
      >
        <View style={styles.statIconContainer}>
          <IconComponent name={icon} size={22} color={COLORS.white} />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const QuickAction = ({ title, icon, IconComponent, onPress, gradient }: { 
    title: string; 
    icon: string; 
    IconComponent: any;
    onPress: () => void; 
    gradient: string[];
  }) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.quickActionIcon}
      >
        <IconComponent name={icon} size={24} color={COLORS.white} />
      </LinearGradient>
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <LinearGradient
        colors={['#FDF6E9', '#FFF8F0', '#FDF6E9']}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Header with Logout Button */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={async () => {
            // First logout to clear state
            await logout();
            // Use dismissTo to fully exit the tab stack and go to login
            while (router.canGoBack()) {
              router.back();
            }
            router.replace('/');
          }}
        >
          <Feather name="log-out" size={16} color={COLORS.white} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>BoutiqueFit</Text>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => router.push('/search')}
        >
          <Feather name="search" size={20} color={COLORS.gray} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Boutique Name Header */}
        <View style={styles.boutiqueHeader}>
          <MaterialCommunityIcons name="scissors-cutting" size={28} color={COLORS.primary} />
          <Text style={styles.boutiqueName}>{user?.boutique_name || 'BoutiqueFit'}</Text>
        </View>
        <Text style={styles.tagline}>Where Elegance Meets Perfection</Text>

        {/* Stats Section */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard 
            title="Customers" 
            value={stats.total_customers} 
            icon="account-group" 
            IconComponent={MaterialCommunityIcons}
            color={COLORS.accent}
            gradient={['#3B82F6', '#2563EB']}
            onPress={() => router.push('/(tabs)/customers')}
          />
          <StatCard 
            title="Pending" 
            value={stats.pending_orders} 
            icon="clock-outline" 
            IconComponent={MaterialCommunityIcons}
            color={COLORS.secondary}
            gradient={['#F97316', '#EA580C']}
            onPress={() => router.push({ pathname: '/(tabs)/orders', params: { filter: 'pending' } })}
          />
          <StatCard 
            title="Due Today" 
            value={stats.delivery_today} 
            icon="calendar-check" 
            IconComponent={MaterialCommunityIcons}
            color={COLORS.primary}
            gradient={['#EF4444', '#DC2626']}
            onPress={() => router.push({ pathname: '/(tabs)/orders', params: { filter: 'today' } })}
          />
          <StatCard 
            title="Due Soon" 
            value={stats.delivery_in_2_days} 
            icon="calendar-alert" 
            IconComponent={MaterialCommunityIcons}
            color={COLORS.gold}
            gradient={['#EAB308', '#CA8A04']}
            onPress={() => router.push({ pathname: '/(tabs)/orders', params: { filter: 'soon' } })}
          />
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <QuickAction
            title="Add Customer"
            icon="user-plus"
            IconComponent={Feather}
            gradient={['#06B6D4', '#0891B2']}
            onPress={() => router.push('/add-customer')}
          />
          <QuickAction
            title="New Order"
            icon="plus-circle"
            IconComponent={Feather}
            gradient={['#C11F27', '#991B1B']}
            onPress={() => router.push('/add-order')}
          />
        </View>
        <View style={styles.quickActionsGrid}>
          <QuickAction
            title="Customers"
            icon="users"
            IconComponent={Feather}
            gradient={['#3B82F6', '#2563EB']}
            onPress={() => router.push('/(tabs)/customers')}
          />
          <QuickAction
            title="Orders"
            icon="package"
            IconComponent={Feather}
            gradient={['#F97316', '#EA580C']}
            onPress={() => router.push('/(tabs)/orders')}
          />
        </View>
        <View style={styles.quickActionsGrid}>
          <QuickAction
            title="Billing"
            icon="credit-card"
            IconComponent={Feather}
            gradient={['#10B981', '#059669']}
            onPress={() => router.push('/(tabs)/billing')}
          />
          <QuickAction
            title="Search"
            icon="search"
            IconComponent={Feather}
            gradient={['#8B5CF6', '#7C3AED']}
            onPress={() => router.push('/search')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.md,
    gap: 6,
  },
  logoutText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  scrollContent: {
    padding: SPACING.sm,
    paddingBottom: SPACING.xxl,
  },
  boutiqueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: 4,
  },
  boutiqueName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 12,
    fontStyle: 'italic',
    color: COLORS.gold,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: SPACING.md,
  },
  statCardWrapper: {
    width: '48%',
  },
  statCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    minHeight: 100,
    ...SHADOWS.medium,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  statTitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: SPACING.sm,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: SPACING.sm,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.small,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.black,
    textAlign: 'center',
  },
});
