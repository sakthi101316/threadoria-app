import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../src/constants/theme';
import { GlassCard } from '../../src/components/GlassCard';
import { VoiceButton } from '../../src/components/VoiceButton';
import { api } from '../../src/services/api';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_fashion-tracker-10/artifacts/jedgi7jd_WhatsApp%20Image%202025-11-28%20at%207.10.00%20PM.jpeg';

interface DashboardStats {
  total_customers: number;
  pending_orders: number;
  delivery_today: number;
  delivery_in_2_days: number;
}

export default function DashboardScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    total_customers: 0,
    pending_orders: 0,
    delivery_today: 0,
    delivery_in_2_days: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const data = await api.getDashboardStats();
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

  const handleVoiceTranscription = (text: string) => {
    // Navigate to search with voice input
    router.push({ pathname: '/search', params: { query: text } });
  };

  const StatCard = ({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) => (
    <GlassCard style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </GlassCard>
  );

  const QuickAction = ({ title, icon, onPress, color }: { title: string; icon: string; onPress: () => void; color: string }) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon as any} size={24} color={COLORS.white} />
      </View>
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <LinearGradient
        colors={[COLORS.cream, '#FFF5E6', COLORS.cream]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <Image source={{ uri: LOGO_URL }} style={styles.logo} resizeMode="contain" />
        </View>

        {/* Stats Section */}
        <View style={styles.statsGrid}>
          <StatCard title="Total Customers" value={stats.total_customers} icon="people" color={COLORS.accent} />
          <StatCard title="Pending Orders" value={stats.pending_orders} icon="time" color={COLORS.secondary} />
          <StatCard title="Due Today" value={stats.delivery_today} icon="today" color={COLORS.primary} />
          <StatCard title="Due in 2 Days" value={stats.delivery_in_2_days} icon="calendar" color={COLORS.gold} />
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <QuickAction
            title="Add Customer"
            icon="person-add"
            color={COLORS.accent}
            onPress={() => router.push('/add-customer')}
          />
          <QuickAction
            title="Add Order"
            icon="add-circle"
            color={COLORS.primary}
            onPress={() => router.push('/add-order')}
          />
          <QuickAction
            title="Search"
            icon="search"
            color={COLORS.secondary}
            onPress={() => router.push('/search')}
          />
        </View>

        {/* Voice Mode */}
        <GlassCard style={styles.voiceCard}>
          <View style={styles.voiceHeader}>
            <Ionicons name="mic" size={24} color={COLORS.gold} />
            <Text style={styles.voiceTitle}>Voice Mode</Text>
          </View>
          <Text style={styles.voiceSubtitle}>Tap to speak commands</Text>
          <View style={styles.voiceButtonContainer}>
            <VoiceButton onTranscription={handleVoiceTranscription} />
          </View>
          <Text style={styles.voiceHint}>
            Try: "Add customer", "Search order", "New measurement"
          </Text>
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  logo: {
    width: 200,
    height: 100,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  statCard: {
    width: '47%',
    alignItems: 'center',
    padding: SPACING.md,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  statTitle: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: SPACING.md,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
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
    marginBottom: SPACING.sm,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.black,
    textAlign: 'center',
  },
  voiceCard: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  voiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  voiceTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  voiceSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: SPACING.lg,
  },
  voiceButtonContainer: {
    marginVertical: SPACING.lg,
  },
  voiceHint: {
    fontSize: 12,
    color: COLORS.gray,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
