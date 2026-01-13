import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../src/constants/theme';
import { GlassCard } from '../../src/components/GlassCard';
import { GoldButton } from '../../src/components/GoldButton';
import { useAuth } from '../../src/context/AuthContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  const MenuItem = ({ icon, title, subtitle, onPress, danger }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    danger?: boolean;
  }) => (
    <TouchableOpacity onPress={onPress} disabled={!onPress} activeOpacity={0.8}>
      <View style={styles.menuItem}>
        <View style={[styles.menuIcon, danger && { backgroundColor: COLORS.error + '20' }]}>
          <Ionicons name={icon as any} size={24} color={danger ? COLORS.error : COLORS.primary} />
        </View>
        <View style={styles.menuContent}>
          <Text style={[styles.menuTitle, danger && { color: COLORS.error }]}>{title}</Text>
          {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
        </View>
        {onPress && <Ionicons name="chevron-forward" size={24} color={COLORS.gray} />}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <LinearGradient
        colors={[COLORS.cream, '#FFF5E6', COLORS.cream]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Info */}
        <GlassCard style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.userName}>{user?.username || 'User'}</Text>
          <Text style={styles.userRole}>Administrator</Text>
        </GlassCard>

        {/* App Info */}
        <GlassCard style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          <MenuItem icon="information-circle" title="Version" subtitle="1.0.0" />
          <MenuItem icon="business" title="Boutique" subtitle="Your Boutique" />
        </GlassCard>

        {/* Actions */}
        <GlassCard style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <MenuItem
            icon="log-out"
            title="Logout"
            onPress={handleLogout}
            danger
          />
        </GlassCard>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>BoutiqueFit</Text>
          <Text style={styles.footerSubtext}>"Where Elegance Meets Perfection"</Text>
        </View>
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
  },
  userCard: {
    alignItems: 'center',
    padding: SPACING.xl,
    marginBottom: SPACING.md,
  },
  userAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  userRole: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 4,
  },
  section: {
    marginBottom: SPACING.md,
    padding: 0,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
    padding: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.black,
  },
  menuSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  footerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  footerSubtext: {
    fontSize: 14,
    fontStyle: 'italic',
    color: COLORS.gray,
    marginTop: 4,
  },
});
