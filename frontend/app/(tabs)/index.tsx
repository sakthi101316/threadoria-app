import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../src/constants/theme';
import { GlassCard } from '../../src/components/GlassCard';
import { VoiceButton } from '../../src/components/VoiceButton';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_fashion-tracker-10/artifacts/jedgi7jd_WhatsApp%20Image%202025-11-28%20at%207.10.00%20PM.jpeg';
const { width } = Dimensions.get('window');

interface DashboardStats {
  total_customers: number;
  pending_orders: number;
  delivery_today: number;
  delivery_in_2_days: number;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { logout } = useAuth();
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
    router.push({ pathname: '/search', params: { query: text } });
  };

  const StatCard = ({ title, value, icon, IconComponent, color, gradient }: { 
    title: string; 
    value: number; 
    icon: string; 
    IconComponent: any;
    color: string;
    gradient: string[];
  }) => (
    <TouchableOpacity activeOpacity={0.9} style={styles.statCardWrapper}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statCard}
      >
        <View style={styles.statIconContainer}>
          <IconComponent name={icon} size={26} color={COLORS.white} />
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
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <LinearGradient
        colors={['#FDF6E9', '#FFF8F0', '#FDF6E9']}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={async () => {
            await logout();
            router.replace('/');
          }}
        >
          <Feather name="log-out" size={22} color={COLORS.error} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>BoutiqueFit</Text>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => router.push('/search')}
        >
          <Feather name="search" size={22} color={COLORS.gray} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Circular Logo Section - Same as login page */}
        <View style={styles.logoSection}>
          <LinearGradient
            colors={['#FFFFFF', '#FFF5E6', '#FFE4C9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoGradientBg}
          >
            <View style={styles.logoInnerCircle}>
              <Image source={{ uri: LOGO_URL }} style={styles.logo} resizeMode="contain" />
            </View>
          </LinearGradient>
          {/* Decorative rings */}
          <View style={[styles.decorativeRing, styles.ring1]} />
          <View style={[styles.decorativeRing, styles.ring2]} />
        </View>

        {/* Tagline */}
        <Text style={styles.tagline}>"Where Elegance Meets Perfection"</Text>

        {/* Stats Section */}
        <View style={styles.statsGrid}>
          <StatCard 
            title="Customers" 
            value={stats.total_customers} 
            icon="account-group" 
            IconComponent={MaterialCommunityIcons}
            color={COLORS.accent}
            gradient={['#3B82F6', '#2563EB']}
          />
          <StatCard 
            title="Pending" 
            value={stats.pending_orders} 
            icon="clock-outline" 
            IconComponent={MaterialCommunityIcons}
            color={COLORS.secondary}
            gradient={['#F97316', '#EA580C']}
          />
          <StatCard 
            title="Due Today" 
            value={stats.delivery_today} 
            icon="calendar-check" 
            IconComponent={MaterialCommunityIcons}
            color={COLORS.primary}
            gradient={['#EF4444', '#DC2626']}
          />
          <StatCard 
            title="Due Soon" 
            value={stats.delivery_in_2_days} 
            icon="calendar-alert" 
            IconComponent={MaterialCommunityIcons}
            color={COLORS.gold}
            gradient={['#EAB308', '#CA8A04']}
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
          <QuickAction
            title="Search"
            icon="search"
            IconComponent={Feather}
            gradient={['#8B5CF6', '#7C3AED']}
            onPress={() => router.push('/search')}
          />
        </View>

        {/* Voice Mode Card */}
        <LinearGradient
          colors={['#FFFFFF', '#FFF9F0']}
          style={styles.voiceCard}
        >
          <View style={styles.voiceHeader}>
            <LinearGradient
              colors={[COLORS.gold, '#D4A853']}
              style={styles.voiceIconBg}
            >
              <MaterialCommunityIcons name="microphone" size={24} color={COLORS.white} />
            </LinearGradient>
            <View>
              <Text style={styles.voiceTitle}>Voice Mode</Text>
              <Text style={styles.voiceSubtitle}>Tap to speak commands</Text>
            </View>
          </View>
          <View style={styles.voiceButtonContainer}>
            <VoiceButton onTranscription={handleVoiceTranscription} />
          </View>
          <View style={styles.voiceHintContainer}>
            <Text style={styles.voiceHint}>Try saying:</Text>
            <View style={styles.voiceExamples}>
              <View style={styles.voiceExample}>
                <Text style={styles.voiceExampleText}>"Add customer"</Text>
              </View>
              <View style={styles.voiceExample}>
                <Text style={styles.voiceExampleText}>"Search order"</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
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
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl * 2,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: SPACING.sm,
    position: 'relative',
  },
  logoGradientBg: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E7C475',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoInnerCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: 130,
    height: 130,
  },
  decorativeRing: {
    position: 'absolute',
    borderWidth: 1.5,
    borderRadius: 100,
  },
  ring1: {
    width: 185,
    height: 185,
    borderColor: COLORS.gold + '40',
    top: -12,
  },
  ring2: {
    width: 210,
    height: 210,
    borderColor: COLORS.primary + '25',
    top: -25,
  },
  tagline: {
    fontSize: 14,
    fontStyle: 'italic',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statCardWrapper: {
    width: '48%',
  },
  statCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    minHeight: 120,
    ...SHADOWS.medium,
  },
  statIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: {
    fontSize: 32,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: SPACING.md,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
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
    width: 54,
    height: 54,
    borderRadius: 27,
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
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.medium,
  },
  voiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  voiceIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  voiceSubtitle: {
    fontSize: 13,
    color: COLORS.gray,
  },
  voiceButtonContainer: {
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  voiceHintContainer: {
    alignItems: 'center',
  },
  voiceHint: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: SPACING.sm,
  },
  voiceExamples: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  voiceExample: {
    backgroundColor: COLORS.cream,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  voiceExampleText: {
    fontSize: 12,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
});
