import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, ORDER_STATUSES } from '../../src/constants/theme';
import { GlassCard } from '../../src/components/GlassCard';
import { StatusBadge } from '../../src/components/StatusBadge';
import { GoldButton } from '../../src/components/GoldButton';
import { api } from '../../src/services/api';
import { format } from 'date-fns';

interface Order {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  order_type: string;
  description: string;
  order_date: string;
  delivery_date: string;
  status: string;
  created_at: string;
}

export default function OrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async (status?: string) => {
    try {
      const data = await api.getOrders({ status: status || undefined });
      setOrders(data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(selectedStatus || undefined);
  }, [selectedStatus]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders(selectedStatus || undefined);
    setRefreshing(false);
  }, [selectedStatus]);

  const StatusFilter = () => (
    <FlatList
      horizontal
      data={[{ key: null, label: 'All' }, ...ORDER_STATUSES]}
      keyExtractor={(item) => String(item.key)}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterContainer}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedStatus === item.key && styles.filterChipActive,
          ]}
          onPress={() => setSelectedStatus(item.key)}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedStatus === item.key && styles.filterChipTextActive,
            ]}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
      )}
    />
  );

  const renderOrder = ({ item }: { item: Order }) => (
    <TouchableOpacity
      onPress={() => router.push(`/order/${item.id}`)}
      activeOpacity={0.8}
    >
      <GlassCard style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderType}>{item.order_type}</Text>
            <Text style={styles.customerName}>{item.customer_name || 'Unknown Customer'}</Text>
          </View>
          <StatusBadge status={item.status} />
        </View>
        
        <View style={styles.orderDetails}>
          <View style={styles.orderDetailItem}>
            <Ionicons name="calendar-outline" size={16} color={COLORS.gray} />
            <Text style={styles.orderDetailText}>
              Order: {format(new Date(item.order_date), 'dd MMM yyyy')}
            </Text>
          </View>
          <View style={styles.orderDetailItem}>
            <Ionicons name="gift-outline" size={16} color={COLORS.primary} />
            <Text style={[styles.orderDetailText, { color: COLORS.primary }]}>
              Delivery: {format(new Date(item.delivery_date), 'dd MMM yyyy')}
            </Text>
          </View>
        </View>

        {item.description ? (
          <Text style={styles.orderDescription} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
      </GlassCard>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <LinearGradient
        colors={[COLORS.cream, '#FFF5E6', COLORS.cream]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.header}>
        <StatusFilter />
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/add-order')}
        >
          <Ionicons name="add" size={28} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color={COLORS.gray} />
            <Text style={styles.emptyText}>
              {selectedStatus ? `No ${selectedStatus} orders` : 'No orders yet'}
            </Text>
            {!selectedStatus && (
              <GoldButton
                title="Create First Order"
                onPress={() => router.push('/add-order')}
                style={styles.emptyButton}
              />
            )}
          </View>
        }
      />
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
    paddingRight: SPACING.md,
    gap: SPACING.sm,
  },
  filterContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.white,
    marginRight: SPACING.sm,
    ...SHADOWS.small,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
  },
  listContent: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  orderCard: {
    padding: SPACING.md,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  orderType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  customerName: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 2,
  },
  orderDetails: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  orderDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderDetailText: {
    fontSize: 13,
    color: COLORS.gray,
  },
  orderDescription: {
    fontSize: 13,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.gray,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  emptyButton: {
    paddingHorizontal: SPACING.xl,
  },
});
