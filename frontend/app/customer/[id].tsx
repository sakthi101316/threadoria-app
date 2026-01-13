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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../src/constants/theme';
import { GlassCard } from '../../src/components/GlassCard';
import { GoldButton } from '../../src/components/GoldButton';
import { StatusBadge } from '../../src/components/StatusBadge';
import { api } from '../../src/services/api';
import { format } from 'date-fns';

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  photo: string;
  notes: string;
  created_at: string;
}

interface Measurement {
  id: string;
  category: string;
  top_measurements: any;
  bottom_measurements: any;
  measurement_date: string;
}

interface Order {
  id: string;
  order_type: string;
  status: string;
  delivery_date: string;
}

export default function CustomerDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('measurements');

  const fetchData = async () => {
    try {
      const [customerData, measurementsData, ordersData] = await Promise.all([
        api.getCustomer(id as string),
        api.getCustomerMeasurements(id as string),
        api.getOrders({ customer_id: id as string }),
      ]);
      setCustomer(customerData);
      setMeasurements(measurementsData);
      setOrders(ordersData);
    } catch (error) {
      console.error('Failed to fetch customer data:', error);
      Alert.alert('Error', 'Failed to load customer');
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

  const handleDelete = () => {
    Alert.alert(
      'Delete Customer',
      'Are you sure? This will also delete all measurements and orders.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteCustomer(id as string);
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete customer');
            }
          },
        },
      ]
    );
  };

  if (!customer) {
    return null;
  }

  const Tab = ({ name, icon, count }: { name: string; icon: string; count?: number }) => (
    <TouchableOpacity
      style={[styles.tab, activeTab === name && styles.tabActive]}
      onPress={() => setActiveTab(name)}
    >
      <Ionicons
        name={icon as any}
        size={20}
        color={activeTab === name ? COLORS.primary : COLORS.gray}
      />
      <Text style={[styles.tabText, activeTab === name && styles.tabTextActive]}>
        {name.charAt(0).toUpperCase() + name.slice(1)}
        {count !== undefined && ` (${count})`}
      </Text>
    </TouchableOpacity>
  );

  const handleDeleteMeasurement = (measurementId: string) => {
    Alert.alert(
      'Delete Measurement',
      'Are you sure you want to delete this measurement?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteMeasurement(measurementId);
              setMeasurements(measurements.filter(m => m.id !== measurementId));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete measurement');
            }
          },
        },
      ]
    );
  };

  const renderMeasurements = () => (
    <View style={styles.tabContent}>
      {measurements.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="body" size={48} color={COLORS.gray} />
          <Text style={styles.emptyText}>No measurements yet</Text>
          <GoldButton
            title="Add Measurement"
            onPress={() => router.push({ pathname: '/add-measurement', params: { customerId: id } })}
            style={styles.emptyButton}
          />
        </View>
      ) : (
        <>
          {measurements.map((m) => (
            <GlassCard key={m.id} style={styles.measurementCard}>
              <View style={styles.measurementHeader}>
                <Text style={styles.measurementCategory}>{m.category} Measurements</Text>
                <View style={styles.measurementActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => router.push({ pathname: '/edit-measurement', params: { measurementId: m.id } })}
                  >
                    <Ionicons name="pencil" size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteMeasurement(m.id)}
                  >
                    <Ionicons name="trash" size={18} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.measurementDate}>
                {format(new Date(m.measurement_date), 'dd MMM yyyy')}
              </Text>
              <View style={styles.measurementGrid}>
                {m.category === 'Top' && m.top_measurements && (
                  <>
                    {Object.entries(m.top_measurements).map(([key, value]) => (
                      value ? (
                        <View key={key} style={styles.measurementItem}>
                          <Text style={styles.measurementLabel}>
                            {key.replace(/_/g, ' ')}
                          </Text>
                          <Text style={styles.measurementValue}>{value as string}"</Text>
                        </View>
                      ) : null
                    ))}
                  </>
                )}
                {m.category === 'Bottom' && m.bottom_measurements && (
                  <>
                    {Object.entries(m.bottom_measurements).map(([key, value]) => (
                      value ? (
                        <View key={key} style={styles.measurementItem}>
                          <Text style={styles.measurementLabel}>
                            {key.replace(/_/g, ' ')}
                          </Text>
                          <Text style={styles.measurementValue}>{value as string}"</Text>
                        </View>
                      ) : null
                    ))}
                  </>
                )}
              </View>
            </GlassCard>
          ))}
          <GoldButton
            title="Add New Measurement"
            variant="outline"
            onPress={() => router.push({ pathname: '/add-measurement', params: { customerId: id } })}
            style={styles.addButton}
          />
        </>
      )}
    </View>
  );

  const renderOrders = () => (
    <View style={styles.tabContent}>
      {orders.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="receipt" size={48} color={COLORS.gray} />
          <Text style={styles.emptyText}>No orders yet</Text>
          <GoldButton
            title="Create Order"
            onPress={() => router.push({ pathname: '/add-order', params: { customerId: id } })}
            style={styles.emptyButton}
          />
        </View>
      ) : (
        <>
          {orders.map((order) => (
            <TouchableOpacity
              key={order.id}
              onPress={() => router.push(`/order/${order.id}`)}
            >
              <GlassCard style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderType}>{order.order_type}</Text>
                  <StatusBadge status={order.status} />
                </View>
                <View style={styles.orderFooter}>
                  <Ionicons name="calendar" size={16} color={COLORS.gray} />
                  <Text style={styles.orderDate}>
                    Delivery: {format(new Date(order.delivery_date), 'dd MMM yyyy')}
                  </Text>
                </View>
              </GlassCard>
            </TouchableOpacity>
          ))}
          <GoldButton
            title="Create New Order"
            variant="outline"
            onPress={() => router.push({ pathname: '/add-order', params: { customerId: id } })}
            style={styles.addButton}
          />
        </>
      )}
    </View>
  );

  const renderNotes = () => (
    <View style={styles.tabContent}>
      <GlassCard style={styles.notesCard}>
        <Text style={styles.notesText}>
          {customer.notes || 'No notes added'}
        </Text>
      </GlassCard>
    </View>
  );

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
        <Text style={styles.headerTitle}>Customer</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
          <Ionicons name="trash" size={24} color={COLORS.error} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Profile Card */}
        <GlassCard style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {customer.photo ? (
              <Image source={{ uri: customer.photo }} style={styles.avatar} />
            ) : (
              <Ionicons name="person" size={48} color={COLORS.gray} />
            )}
          </View>
          <Text style={styles.customerName}>{customer.name}</Text>
          
          <View style={styles.contactRow}>
            <TouchableOpacity style={styles.contactButton}>
              <Ionicons name="call" size={20} color={COLORS.primary} />
              <Text style={styles.contactText}>{customer.phone}</Text>
            </TouchableOpacity>
          </View>
          
          {customer.address ? (
            <View style={styles.addressRow}>
              <Ionicons name="location" size={16} color={COLORS.gray} />
              <Text style={styles.addressText}>{customer.address}</Text>
            </View>
          ) : null}
        </GlassCard>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <Tab name="measurements" icon="body" count={measurements.length} />
          <Tab name="orders" icon="receipt" count={orders.length} />
          <Tab name="notes" icon="document-text" />
        </View>

        {/* Tab Content */}
        {activeTab === 'measurements' && renderMeasurements()}
        {activeTab === 'orders' && renderOrders()}
        {activeTab === 'notes' && renderNotes()}
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
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  profileCard: {
    alignItems: 'center',
    padding: SPACING.xl,
    marginBottom: SPACING.md,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  customerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: SPACING.sm,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  contactText: {
    fontSize: 16,
    color: COLORS.primary,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  addressText: {
    fontSize: 14,
    color: COLORS.gray,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: 4,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: 4,
  },
  tabActive: {
    backgroundColor: COLORS.cream,
  },
  tabText: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  tabContent: {
    gap: SPACING.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
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
  measurementCard: {
    padding: SPACING.md,
  },
  measurementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  measurementCategory: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  measurementDate: {
    fontSize: 12,
    color: COLORS.gray,
  },
  measurementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  measurementItem: {
    width: '30%',
    padding: SPACING.xs,
  },
  measurementLabel: {
    fontSize: 10,
    color: COLORS.gray,
    textTransform: 'capitalize',
  },
  measurementValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
  },
  orderCard: {
    padding: SPACING.md,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  orderType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  orderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  orderDate: {
    fontSize: 14,
    color: COLORS.gray,
  },
  addButton: {
    marginTop: SPACING.sm,
  },
  notesCard: {
    padding: SPACING.md,
  },
  notesText: {
    fontSize: 16,
    color: COLORS.black,
    lineHeight: 24,
  },
});
