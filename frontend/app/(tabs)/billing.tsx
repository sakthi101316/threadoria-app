import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  FlatList,
  Alert,
  Linking,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../src/constants/theme';
import { GlassCard } from '../../src/components/GlassCard';
import { GoldButton } from '../../src/components/GoldButton';
import { api } from '../../src/services/api';
import { format } from 'date-fns';

const QR_CODE_URL = 'https://customer-assets.emergentagent.com/job_fashion-tracker-10/artifacts/qo2oodvg_WhatsApp%20Image%202026-01-11%20at%201.04.36%20PM.jpeg';

interface PaymentAnalytics {
  total_revenue: number;
  total_collected: number;
  total_pending: number;
  paid_count: number;
  partial_count: number;
  unpaid_count: number;
  payments: any[];
}

interface PaymentRecord {
  id: string;
  order_id: string;
  customer_name: string;
  customer_phone: string;
  order_type: string;
  final_amount: number;
  advance_paid: number;
  balance_amount: number;
  payment_status: string;
  last_updated: string;
}

export default function BillingScreen() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<PaymentAnalytics | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  const periods = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'all', label: 'All Time' },
  ];

  const statusFilters = [
    { key: null, label: 'All', color: COLORS.gray },
    { key: 'paid', label: 'Paid', color: COLORS.success },
    { key: 'partial', label: 'Partial', color: COLORS.warning },
    { key: 'unpaid', label: 'Unpaid', color: COLORS.error },
  ];

  const fetchData = async () => {
    try {
      const analyticsData = await api.getPaymentAnalytics(selectedPeriod);
      setAnalytics(analyticsData);
      
      let paymentsData = analyticsData.payments;
      if (selectedStatus) {
        paymentsData = paymentsData.filter((p: PaymentRecord) => p.payment_status === selectedStatus);
      }
      setPayments(paymentsData);
    } catch (error) {
      console.error('Failed to fetch billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedPeriod, selectedStatus]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [selectedPeriod, selectedStatus]);

  const handleRecordPayment = async () => {
    if (!selectedPayment || !paymentAmount) {
      Alert.alert('Error', 'Please enter payment amount');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      const result = await api.recordQRPayment(selectedPayment.order_id, amount);
      if (result.success) {
        Alert.alert('Success', result.message, [
          {
            text: 'Send WhatsApp',
            onPress: async () => {
              try {
                const whatsapp = await api.getWhatsAppPaymentReceived(selectedPayment.order_id, amount);
                await Linking.openURL(whatsapp.url);
              } catch (e) {
                console.error('WhatsApp error:', e);
              }
            },
          },
          { text: 'OK' },
        ]);
        setShowRecordPaymentModal(false);
        setPaymentAmount('');
        setSelectedPayment(null);
        fetchData();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to record payment');
    }
  };

  const handleWhatsAppReminder = async (payment: PaymentRecord) => {
    try {
      const response = await api.getWhatsAppBalanceReminder(payment.order_id);
      await Linking.openURL(response.url);
    } catch (error) {
      Alert.alert('Error', 'Failed to open WhatsApp');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return COLORS.success;
      case 'partial': return COLORS.warning;
      case 'unpaid': return COLORS.error;
      default: return COLORS.gray;
    }
  };

  const StatCard = ({ title, value, icon, gradient, prefix = '' }: {
    title: string;
    value: number;
    icon: string;
    gradient: string[];
    prefix?: string;
  }) => (
    <LinearGradient colors={gradient} style={styles.statCard}>
      <MaterialCommunityIcons name={icon as any} size={24} color={COLORS.white} />
      <Text style={styles.statValue}>{prefix}{value.toLocaleString()}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </LinearGradient>
  );

  const renderPaymentItem = ({ item }: { item: PaymentRecord }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => {
        setSelectedPayment(item);
        setShowRecordPaymentModal(true);
      }}
    >
      <GlassCard style={styles.paymentCard}>
        <View style={styles.paymentHeader}>
          <View style={styles.paymentCustomer}>
            <MaterialCommunityIcons name="account" size={20} color={COLORS.gray} />
            <View>
              <Text style={styles.customerName}>{item.customer_name}</Text>
              <Text style={styles.orderType}>{item.order_type}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.payment_status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.payment_status) }]}>
              {item.payment_status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.paymentDetails}>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Total Amount</Text>
            <Text style={styles.paymentValue}>₹{item.final_amount.toFixed(2)}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Collected</Text>
            <Text style={[styles.paymentValue, { color: COLORS.success }]}>₹{item.advance_paid.toFixed(2)}</Text>
          </View>
          <View style={[styles.paymentRow, styles.balanceRow]}>
            <Text style={styles.balanceLabel}>Balance Due</Text>
            <Text style={[styles.balanceValue, { color: item.balance_amount > 0 ? COLORS.error : COLORS.success }]}>
              ₹{item.balance_amount.toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.paymentActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              setSelectedPayment(item);
              setShowRecordPaymentModal(true);
            }}
          >
            <MaterialCommunityIcons name="cash-plus" size={18} color={COLORS.success} />
            <Text style={[styles.actionText, { color: COLORS.success }]}>Record</Text>
          </TouchableOpacity>
          
          {item.balance_amount > 0 && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleWhatsAppReminder(item)}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
              <Text style={[styles.actionText, { color: "#25D366" }]}>Remind</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/order/${item.order_id}`)}
          >
            <Feather name="eye" size={18} color={COLORS.accent} />
            <Text style={[styles.actionText, { color: COLORS.accent }]}>View</Text>
          </TouchableOpacity>
        </View>
      </GlassCard>
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
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Billing & Payments</Text>
        <TouchableOpacity style={styles.qrButton} onPress={() => setShowQRModal(true)}>
          <MaterialCommunityIcons name="qrcode-scan" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Period Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodFilter}>
          {periods.map((period) => (
            <TouchableOpacity
              key={period.key}
              style={[styles.periodChip, selectedPeriod === period.key && styles.periodChipActive]}
              onPress={() => setSelectedPeriod(period.key)}
            >
              <Text style={[styles.periodText, selectedPeriod === period.key && styles.periodTextActive]}>
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Analytics Cards */}
        {analytics && (
          <View style={styles.analyticsGrid}>
            <StatCard
              title="Total Revenue"
              value={analytics.total_revenue}
              icon="currency-inr"
              gradient={['#6366F1', '#4F46E5']}
              prefix="₹"
            />
            <StatCard
              title="Collected"
              value={analytics.total_collected}
              icon="cash-check"
              gradient={['#10B981', '#059669']}
              prefix="₹"
            />
            <StatCard
              title="Pending"
              value={analytics.total_pending}
              icon="cash-remove"
              gradient={['#F59E0B', '#D97706']}
              prefix="₹"
            />
            <StatCard
              title="Paid Orders"
              value={analytics.paid_count}
              icon="check-circle"
              gradient={['#22C55E', '#16A34A']}
            />
          </View>
        )}

        {/* QR Code Section */}
        <GlassCard style={styles.qrSection}>
          <View style={styles.qrHeader}>
            <MaterialCommunityIcons name="qrcode" size={24} color={COLORS.gold} />
            <Text style={styles.qrTitle}>Payment QR Code</Text>
          </View>
          <Text style={styles.qrSubtitle}>Customers can scan to make payment</Text>
          <TouchableOpacity onPress={() => setShowQRModal(true)}>
            <Image source={{ uri: QR_CODE_URL }} style={styles.qrPreview} resizeMode="contain" />
          </TouchableOpacity>
          <GoldButton
            title="Show QR to Customer"
            onPress={() => setShowQRModal(true)}
            variant="outline"
            style={styles.qrButton2}
          />
        </GlassCard>

        {/* Status Filter */}
        <Text style={styles.sectionTitle}>Payment Records</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusFilter}>
          {statusFilters.map((filter) => (
            <TouchableOpacity
              key={String(filter.key)}
              style={[
                styles.statusChip,
                selectedStatus === filter.key && { backgroundColor: filter.color + '20', borderColor: filter.color }
              ]}
              onPress={() => setSelectedStatus(filter.key)}
            >
              <View style={[styles.statusDot, { backgroundColor: filter.color }]} />
              <Text style={[styles.statusChipText, selectedStatus === filter.key && { color: filter.color }]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Payment List */}
        {payments.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="cash-remove" size={64} color={COLORS.gray} />
            <Text style={styles.emptyText}>No payments found</Text>
          </View>
        ) : (
          <View style={styles.paymentsList}>
            {payments.map((payment) => (
              <View key={payment.id}>
                {renderPaymentItem({ item: payment })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* QR Code Modal */}
      <Modal visible={showQRModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.qrModalContent}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowQRModal(false)}>
              <Ionicons name="close" size={28} color={COLORS.black} />
            </TouchableOpacity>
            <Text style={styles.qrModalTitle}>Scan to Pay</Text>
            <Text style={styles.qrModalSubtitle}>Maahis Designer Boutique</Text>
            <Image source={{ uri: QR_CODE_URL }} style={styles.qrLarge} resizeMode="contain" />
            <Text style={styles.qrInstruction}>
              Ask customer to scan this QR code to make payment via UPI
            </Text>
          </View>
        </View>
      </Modal>

      {/* Record Payment Modal */}
      <Modal visible={showRecordPaymentModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.recordModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Payment</Text>
              <TouchableOpacity onPress={() => {
                setShowRecordPaymentModal(false);
                setPaymentAmount('');
                setSelectedPayment(null);
              }}>
                <Ionicons name="close" size={24} color={COLORS.black} />
              </TouchableOpacity>
            </View>

            {selectedPayment && (
              <>
                <View style={styles.paymentInfo}>
                  <Text style={styles.infoLabel}>Customer</Text>
                  <Text style={styles.infoValue}>{selectedPayment.customer_name}</Text>
                  <Text style={styles.infoLabel}>Order</Text>
                  <Text style={styles.infoValue}>{selectedPayment.order_type}</Text>
                  <Text style={styles.infoLabel}>Balance Due</Text>
                  <Text style={[styles.infoValue, { color: COLORS.error }]}>
                    ₹{selectedPayment.balance_amount.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Payment Amount (₹)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter amount received"
                    placeholderTextColor={COLORS.gray}
                    value={paymentAmount}
                    onChangeText={setPaymentAmount}
                    keyboardType="numeric"
                  />
                </View>

                <GoldButton
                  title="Record Payment & Send WhatsApp"
                  onPress={handleRecordPayment}
                  style={styles.recordButton}
                />
              </>
            )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  qrButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl * 2,
  },
  periodFilter: {
    marginBottom: SPACING.md,
  },
  periodChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.white,
    marginRight: SPACING.sm,
    ...SHADOWS.small,
  },
  periodChipActive: {
    backgroundColor: COLORS.primary,
  },
  periodText: {
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: '500',
  },
  periodTextActive: {
    color: COLORS.white,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statCard: {
    width: '48%',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: SPACING.xs,
  },
  statTitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  qrSection: {
    alignItems: 'center',
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  qrSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: SPACING.md,
  },
  qrPreview: {
    width: 150,
    height: 150,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },
  qrButton2: {
    paddingHorizontal: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: SPACING.sm,
  },
  statusFilter: {
    marginBottom: SPACING.md,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.white,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusChipText: {
    fontSize: 13,
    color: COLORS.gray,
    fontWeight: '500',
  },
  paymentsList: {
    gap: SPACING.md,
  },
  paymentCard: {
    padding: SPACING.md,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  paymentCustomer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
  },
  orderType: {
    fontSize: 13,
    color: COLORS.gray,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  paymentDetails: {
    backgroundColor: COLORS.cream,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  paymentLabel: {
    fontSize: 14,
    color: COLORS.gray,
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
  },
  balanceRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    paddingTop: SPACING.sm,
    marginTop: SPACING.xs,
    marginBottom: 0,
  },
  balanceLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.black,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.gray,
    marginTop: SPACING.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  qrModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 350,
  },
  closeButton: {
    position: 'absolute',
    right: SPACING.md,
    top: SPACING.md,
  },
  qrModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.black,
    marginTop: SPACING.lg,
  },
  qrModalSubtitle: {
    fontSize: 16,
    color: COLORS.primary,
    marginBottom: SPACING.lg,
  },
  qrLarge: {
    width: 250,
    height: 250,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
  },
  qrInstruction: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
  },
  recordModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  paymentInfo: {
    backgroundColor: COLORS.cream,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: SPACING.sm,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.cream,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: 18,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  recordButton: {
    marginTop: SPACING.sm,
  },
});
