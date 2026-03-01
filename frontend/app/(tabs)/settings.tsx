import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../src/constants/theme';
import { GlassCard } from '../../src/components/GlassCard';
import { GoldButton } from '../../src/components/GoldButton';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/services/api';

export default function SettingsScreen() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupEmail, setBackupEmail] = useState('');
  const [backingUp, setBackingUp] = useState(false);

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  const confirmLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: handleLogout },
      ]
    );
  };

  const handleBackup = async () => {
    if (!backupEmail || !backupEmail.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    
    setBackingUp(true);
    try {
      await api.requestBackup(backupEmail);
      Alert.alert('Success', `Backup will be sent to ${backupEmail}`, [
        { text: 'OK', onPress: () => setShowBackupModal(false) }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create backup');
    } finally {
      setBackingUp(false);
    }
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
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
          <Text style={styles.userName}>{user?.boutique_name || 'My Boutique'}</Text>
          <Text style={styles.userRole}>Administrator</Text>
        </GlassCard>

        {/* App Info */}
        <GlassCard style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          <MenuItem icon="information-circle" title="Version" subtitle="1.0.0" />
          <MenuItem icon="business" title="Boutique" subtitle={user?.boutique_name || 'My Boutique'} />
        </GlassCard>

        {/* Backup */}
        <GlassCard style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          <MenuItem
            icon="cloud-download"
            title="Backup Data"
            subtitle="Send backup to email"
            onPress={() => setShowBackupModal(true)}
          />
        </GlassCard>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>BoutiqueFit</Text>
          <Text style={styles.footerSubtext}>"Where Elegance Meets Perfection"</Text>
        </View>
      </ScrollView>

      {/* Backup Modal */}
      <Modal visible={showBackupModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Backup Data</Text>
            <Text style={styles.modalSubtitle}>Enter email to receive backup</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="your@email.com"
              placeholderTextColor={COLORS.gray}
              value={backupEmail}
              onChangeText={setBackupEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowBackupModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalConfirmButton}
                onPress={handleBackup}
                disabled={backingUp}
              >
                {backingUp ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.modalConfirmText}>Send Backup</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.black,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: SPACING.md,
  },
  modalInput: {
    backgroundColor: COLORS.cream,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    marginBottom: SPACING.md,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  modalCancelButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
  },
  modalCancelText: {
    color: COLORS.gray,
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: COLORS.white,
    fontWeight: '600',
  },
});
