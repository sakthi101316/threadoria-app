import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  RefreshControl,
  Linking,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, ORDER_STATUSES } from '../../src/constants/theme';
import { GlassCard } from '../../src/components/GlassCard';
import { GoldButton } from '../../src/components/GoldButton';
import { StatusBadge } from '../../src/components/StatusBadge';
import { api } from '../../src/services/api';
import { format } from 'date-fns';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Order {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  measurement_id: string;
  order_type: string;
  description: string;
  material_photos: string[];
  order_date: string;
  delivery_date: string;
  status: string;
  voice_instructions: string;
}

interface Payment {
  id: string;
  final_amount: number;
  advance_paid: number;
  balance_amount: number;
  payment_status: string;
}

export default function OrderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [orderData, paymentData] = await Promise.all([
        api.getOrder(id as string),
        api.getOrderPayment(id as string).catch(() => null),
      ]);
      setOrder(orderData);
      setPayment(paymentData);
    } catch (error) {
      console.error('Failed to fetch order data:', error);
      Alert.alert('Error', 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [id]);

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      await api.updateOrderStatus(id as string, newStatus);
      setOrder(prev => prev ? { ...prev, status: newStatus } : null);
      Alert.alert('Success', `Status updated to ${newStatus}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const handleWhatsApp = async (type: 'confirmation' | 'delivery' | 'balance') => {
    try {
      let response;
      switch (type) {
        case 'confirmation':
          response = await api.getWhatsAppOrderConfirmation(id as string);
          break;
        case 'delivery':
          response = await api.getWhatsAppDeliveryReminder(id as string);
          break;
        case 'balance':
          response = await api.getWhatsAppBalanceReminder(id as string);
          break;
      }
      
      const canOpen = await Linking.canOpenURL(response.url);
      if (canOpen) {
        await Linking.openURL(response.url);
      } else {
        Alert.alert('Error', 'WhatsApp is not installed');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open WhatsApp');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Order',
      'Are you sure you want to delete this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteOrder(id as string);
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete order');
            }
          },
        },
      ]
    );
  };

  if (!order) {
    return null;
  }

  const currentStatusIndex = ORDER_STATUSES.findIndex(s => s.key === order.status);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[COLORS.cream, '#FFF5E6', COLORS.cream]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={() => router.push({ pathname: '/edit-order', params: { orderId: id } })} 
            style={styles.editButton}
          >
            <Ionicons name="pencil" size={22} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
            <Ionicons name="trash" size={22} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Order Info Card */}
        <GlassCard style={styles.section}>
          <View style={styles.orderHeader}>
            <View>
              <Text style={styles.orderType}>{order.order_type}</Text>
              <Text style={styles.customerName}>{order.customer_name}</Text>
              <Text style={styles.customerPhone}>{order.customer_phone}</Text>
            </View>
            <StatusBadge status={order.status} />
          </View>
          
          {order.description ? (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionLabel}>Description</Text>
              <Text style={styles.descriptionText}>{order.description}</Text>
            </View>
          ) : null}

          {order.voice_instructions ? (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionLabel}>Voice Instructions</Text>
              <Text style={styles.descriptionText}>{order.voice_instructions}</Text>
            </View>
          ) : null}
        </GlassCard>

        {/* Dates Card */}
        <GlassCard style={styles.section}>
          <Text style={styles.sectionTitle}>Dates</Text>
          <View style={styles.datesRow}>
            <View style={styles.dateItem}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.gray} />
              <View>
                <Text style={styles.dateLabel}>Order Date</Text>
                <Text style={styles.dateValue}>
                  {format(new Date(order.order_date), 'dd MMM yyyy')}
                </Text>
              </View>
            </View>
            <View style={styles.dateItem}>
              <Ionicons name="gift" size={20} color={COLORS.primary} />
              <View>
                <Text style={styles.dateLabel}>Delivery Date</Text>
                <Text style={[styles.dateValue, { color: COLORS.primary }]}>
                  {format(new Date(order.delivery_date), 'dd MMM yyyy')}
                </Text>
              </View>
            </View>
          </View>
        </GlassCard>

        {/* Status Flow */}
        <GlassCard style={styles.section}>
          <Text style={styles.sectionTitle}>Order Status</Text>
          <View style={styles.statusFlow}>
            {ORDER_STATUSES.map((status, index) => {
              const isActive = index <= currentStatusIndex;
              const isCurrent = status.key === order.status;
              return (
                <TouchableOpacity
                  key={status.key}
                  style={[
                    styles.statusStep,
                    isActive && styles.statusStepActive,
                    isCurrent && { borderColor: status.color, borderWidth: 2 },
                  ]}
                  onPress={() => handleStatusUpdate(status.key)}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: isActive ? status.color : COLORS.lightGray },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusLabel,
                      isActive && { color: status.color },
                    ]}
                  >
                    {status.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </GlassCard>

        {/* Payment Card */}
        <GlassCard style={styles.section}>
          <Text style={styles.sectionTitle}>Payment</Text>
          {payment ? (
            <View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Final Amount</Text>
                <Text style={styles.paymentValue}>Rs. {payment.final_amount.toFixed(2)}</Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Advance Paid</Text>
                <Text style={[styles.paymentValue, { color: COLORS.success }]}>
                  Rs. {payment.advance_paid.toFixed(2)}
                </Text>
              </View>
              <View style={[styles.paymentRow, styles.balanceRow]}>
                <Text style={styles.balanceLabel}>Balance</Text>
                <Text
                  style={[
                    styles.balanceValue,
                    { color: payment.balance_amount > 0 ? COLORS.error : COLORS.success },
                  ]}
                >
                  Rs. {payment.balance_amount.toFixed(2)}
                </Text>
              </View>
              <View style={styles.paymentStatus}>
                <Text style={styles.paymentStatusLabel}>Status: </Text>
                <Text
                  style={[
                    styles.paymentStatusValue,
                    {
                      color:
                        payment.payment_status === 'paid'
                          ? COLORS.success
                          : payment.payment_status === 'partial'
                          ? COLORS.warning
                          : COLORS.error,
                    },
                  ]}
                >
                  {payment.payment_status.toUpperCase()}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noPaymentText}>No payment recorded</Text>
          )}
        </GlassCard>

        {/* Material Photos */}
        {order.material_photos && order.material_photos.length > 0 && (
          <GlassCard style={styles.section}>
            <Text style={styles.sectionTitle}>Material Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.photosRow}>
                {order.material_photos.map((photo, index) => (
                  <Image key={index} source={{ uri: photo }} style={styles.materialPhoto} />
                ))}
              </View>
            </ScrollView>
          </GlassCard>
        )}

        {/* WhatsApp Actions */}
        <GlassCard style={styles.section}>
          <Text style={styles.sectionTitle}>WhatsApp Messages</Text>
          <View style={styles.whatsappButtons}>
            <TouchableOpacity
              style={styles.whatsappButton}
              onPress={() => handleWhatsApp('confirmation')}
            >
              <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
              <Text style={styles.whatsappButtonText}>Order Confirmation</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.whatsappButton}
              onPress={() => handleWhatsApp('delivery')}
            >
              <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
              <Text style={styles.whatsappButtonText}>Delivery Reminder</Text>
            </TouchableOpacity>
            {payment && payment.balance_amount > 0 && (
              <TouchableOpacity
                style={styles.whatsappButton}
                onPress={() => handleWhatsApp('balance')}
              >
                <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
                <Text style={styles.whatsappButtonText}>Balance Reminder</Text>
              </TouchableOpacity>
            )}
          </View>
        </GlassCard>
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
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  deleteButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  editButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  section: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: SPACING.md,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderType: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  customerName: {
    fontSize: 16,
    color: COLORS.gray,
    marginTop: 4,
  },
  customerPhone: {
    fontSize: 14,
    color: COLORS.accent,
    marginTop: 2,
  },
  descriptionSection: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 14,
    color: COLORS.black,
    lineHeight: 20,
  },
  datesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  dateLabel: {
    fontSize: 12,
    color: COLORS.gray,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
  },
  statusFlow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  statusStep: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cream,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    gap: 4,
  },
  statusStepActive: {
    backgroundColor: COLORS.white,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
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
    paddingTop: SPACING.md,
    marginTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  balanceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  paymentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  paymentStatusLabel: {
    fontSize: 14,
    color: COLORS.gray,
  },
  paymentStatusValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  noPaymentText: {
    fontSize: 14,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
  photosRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  materialPhoto: {
    width: 100,
    height: 100,
    borderRadius: BORDER_RADIUS.md,
  },
  whatsappButtons: {
    gap: SPACING.sm,
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cream,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  whatsappButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.black,
  },
});
