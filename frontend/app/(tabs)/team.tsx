import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../src/constants/theme';
import { GlassCard } from '../../src/components/GlassCard';
import { GoldButton } from '../../src/components/GoldButton';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/services/api';

// Use same base URL as api service - with guaranteed fallback
const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://maahis-production.up.railway.app';

interface Assignment {
  id: string;
  order_number: string;
  customer_name: string;
  garment_type: string;
  stage: string;
  notes?: string;
}

interface StaffMember {
  id: string;
  name: string;
  role: 'master' | 'tailor';
  pieces_in_hand: number;
  assignments: Assignment[];
}

interface StaffReport {
  masters_count: number;
  tailors_active: number;
  done_today: number;
  masters: StaffMember[];
  tailors: StaffMember[];
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  garment_type: string;
}

export default function TeamScreen() {
  const { user } = useAuth();
  const [report, setReport] = useState<StaffReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal states
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  
  // Add staff form
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'master' | 'tailor'>('tailor');
  const [addingStaff, setAddingStaff] = useState(false);
  
  // Assign form
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [assignStage, setAssignStage] = useState<'Cutting' | 'Stitching' | 'Assigned'>('Assigned');
  const [assignNotes, setAssignNotes] = useState('');

  const fetchReport = async () => {
    try {
      console.log('Fetching staff report for:', user?.user_id);
      console.log('API_BASE:', API_BASE);
      const url = `${API_BASE}/api/staff/report?boutique=${user?.user_id}`;
      console.log('Fetching from URL:', url);
      
      const response = await fetch(url);
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Staff report data:', JSON.stringify(data));
        setReport(data);
      } else {
        console.log('Response not OK, setting empty report');
        setReport({
          masters_count: 0,
          tailors_active: 0,
          done_today: 0,
          masters: [],
          tailors: [],
        });
      }
    } catch (error) {
      console.error('Failed to fetch team report:', error);
      setReport({
        masters_count: 0,
        tailors_active: 0,
        done_today: 0,
        masters: [],
        tailors: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const ordersData = await api.getOrders(user?.user_id);
      const formattedOrders = ordersData.map((o: any) => ({
        id: o.id,
        order_number: o.order_number || o.id.slice(-6).toUpperCase(),
        customer_name: o.customer_name,
        garment_type: o.garment_type || o.order_type,
      }));
      setOrders(formattedOrders);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [user?.user_id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReport();
    setRefreshing(false);
  }, []);

  const handleAddStaff = async () => {
    if (!newStaffName.trim()) {
      Alert.alert('Error', 'Please enter staff name');
      return;
    }

    setAddingStaff(true);
    try {
      console.log('Adding staff:', newStaffName, newStaffRole, user?.user_id);
      const url = `${API_BASE}/api/staff/add`;
      console.log('Add staff URL:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStaffName.trim(),
          role: newStaffRole,
          boutique_id: user?.user_id,
        }),
      });

      console.log('Add staff response status:', response.status);
      const data = await response.json();
      console.log('Add staff response:', JSON.stringify(data));

      if (response.ok && data.success) {
        setNewStaffName('');
        setShowAddStaffModal(false);
        // Force refresh the list
        setLoading(true);
        await fetchReport();
        Alert.alert('Success', `${newStaffRole === 'master' ? 'Master' : 'Tailor'} "${newStaffName}" added successfully!`);
      } else {
        throw new Error(data.detail || 'Failed to add staff');
      }
    } catch (error: any) {
      console.error('Add staff error:', error);
      Alert.alert('Error', error.message || 'Failed to add staff member');
    } finally {
      setAddingStaff(false);
    }
  };

  const handleDeleteStaff = async (staffId: string, staffName: string) => {
    Alert.alert(
      'Remove Staff',
      `Are you sure you want to remove ${staffName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_BASE}/api/staff/${staffId}`, {
                method: 'DELETE',
              });
              if (response.ok) {
                Alert.alert('Success', 'Staff member removed');
                fetchReport();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to remove staff');
            }
          },
        },
      ]
    );
  };

  const handleOpenAssign = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setSelectedOrder(null);
    setAssignStage('Assigned');
    setAssignNotes('');
    setOrderSearch('');
    fetchOrders();
    setShowAssignModal(true);
  };

  const handleAssign = async () => {
    if (!selectedOrder || !selectedStaff) {
      Alert.alert('Error', 'Please select an order');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/staff/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: selectedStaff.id,
          order_number: selectedOrder.order_number,
          customer_name: selectedOrder.customer_name,
          garment_type: selectedOrder.garment_type,
          stage: assignStage,
          notes: assignNotes,
          boutique_id: user?.user_id,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Work assigned!');
        setShowAssignModal(false);
        fetchReport();
      } else {
        throw new Error('Failed to assign');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to assign work');
    }
  };

  const handleMarkDone = async (assignmentId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/staff/assignment/${assignmentId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        Alert.alert('Success', 'Marked as done!');
        fetchReport();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to mark as done');
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage.toLowerCase()) {
      case 'cutting': return '#FF6B6B';
      case 'stitching': return '#4ECDC4';
      case 'assigned': return '#FFE66D';
      default: return COLORS.gray;
    }
  };

  const filteredOrders = orders.filter(o => 
    o.customer_name.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.garment_type.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.order_number.toLowerCase().includes(orderSearch.toLowerCase())
  );

  const StaffCard = ({ staff, isMaster }: { staff: StaffMember; isMaster: boolean }) => (
    <GlassCard style={styles.staffCard}>
      <View style={styles.staffHeader}>
        <View style={styles.staffInfo}>
          <View style={[styles.roleIcon, { backgroundColor: isMaster ? '#6366F1' : '#10B981' }]}>
            <MaterialCommunityIcons 
              name={isMaster ? "scissors-cutting" : "needle"} 
              size={20} 
              color={COLORS.white} 
            />
          </View>
          <View>
            <Text style={styles.staffName}>{staff.name}</Text>
            <Text style={styles.piecesText}>{staff.pieces_in_hand} pieces in hand</Text>
          </View>
        </View>
        <View style={styles.staffActions}>
          <TouchableOpacity 
            style={styles.assignButton}
            onPress={() => handleOpenAssign(staff)}
          >
            <Ionicons name="add" size={18} color={COLORS.white} />
            <Text style={styles.assignButtonText}>Assign</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => handleDeleteStaff(staff.id, staff.name)}
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>

      {staff.assignments.length > 0 && (
        <View style={styles.assignmentsList}>
          {staff.assignments.map((assignment) => (
            <View key={assignment.id} style={styles.assignmentItem}>
              <View style={styles.assignmentInfo}>
                <Text style={styles.assignmentCustomer}>{assignment.customer_name}</Text>
                <Text style={styles.assignmentGarment}>{assignment.garment_type}</Text>
                <View style={[styles.stageBadge, { backgroundColor: getStageColor(assignment.stage) }]}>
                  <Text style={styles.stageText}>{assignment.stage}</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.doneButton}
                onPress={() => handleMarkDone(assignment.id)}
              >
                <Ionicons name="checkmark" size={18} color={COLORS.white} />
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {staff.assignments.length === 0 && (
        <Text style={styles.noAssignments}>No current assignments</Text>
      )}
    </GlassCard>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <LinearGradient
        colors={['#FDF6E9', '#FFF8F0', '#FDF6E9']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Team</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowAddStaffModal(true)}
        >
          <Ionicons name="person-add" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Bar */}
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <MaterialCommunityIcons name="scissors-cutting" size={24} color="#6366F1" />
            <Text style={styles.summaryValue}>{report?.masters_count || 0}</Text>
            <Text style={styles.summaryLabel}>Masters</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <MaterialCommunityIcons name="needle" size={24} color="#10B981" />
            <Text style={styles.summaryValue}>{report?.tailors_active || 0}</Text>
            <Text style={styles.summaryLabel}>Tailors</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
            <Text style={styles.summaryValue}>{report?.done_today || 0}</Text>
            <Text style={styles.summaryLabel}>Done Today</Text>
          </View>
        </View>

        {/* Cutting Masters Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="scissors-cutting" size={22} color="#6366F1" />
            <Text style={styles.sectionTitle}>Cutting Masters</Text>
          </View>
          {report?.masters && report.masters.length > 0 ? (
            report.masters.map((master) => (
              <StaffCard key={master.id} staff={master} isMaster={true} />
            ))
          ) : (
            <GlassCard style={styles.emptyCard}>
              <Text style={styles.emptyText}>No cutting masters added yet</Text>
              <TouchableOpacity onPress={() => { setNewStaffRole('master'); setShowAddStaffModal(true); }}>
                <Text style={styles.addLink}>+ Add Master</Text>
              </TouchableOpacity>
            </GlassCard>
          )}
        </View>

        {/* Tailors Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="needle" size={22} color="#10B981" />
            <Text style={styles.sectionTitle}>Tailors</Text>
          </View>
          {report?.tailors && report.tailors.length > 0 ? (
            report.tailors.map((tailor) => (
              <StaffCard key={tailor.id} staff={tailor} isMaster={false} />
            ))
          ) : (
            <GlassCard style={styles.emptyCard}>
              <Text style={styles.emptyText}>No tailors added yet</Text>
              <TouchableOpacity onPress={() => { setNewStaffRole('tailor'); setShowAddStaffModal(true); }}>
                <Text style={styles.addLink}>+ Add Tailor</Text>
              </TouchableOpacity>
            </GlassCard>
          )}
        </View>
      </ScrollView>

      {/* Add Staff Modal */}
      <Modal visible={showAddStaffModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Staff Member</Text>
              <TouchableOpacity onPress={() => setShowAddStaffModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.black} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Name</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter staff name"
                placeholderTextColor={COLORS.gray}
                value={newStaffName}
                onChangeText={setNewStaffName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Role</Text>
              <View style={styles.roleSelector}>
                <TouchableOpacity
                  style={[styles.roleOption, newStaffRole === 'master' && styles.roleOptionActive]}
                  onPress={() => setNewStaffRole('master')}
                >
                  <MaterialCommunityIcons name="scissors-cutting" size={20} color={newStaffRole === 'master' ? COLORS.white : COLORS.gray} />
                  <Text style={[styles.roleOptionText, newStaffRole === 'master' && styles.roleOptionTextActive]}>Master</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleOption, newStaffRole === 'tailor' && styles.roleOptionActive]}
                  onPress={() => setNewStaffRole('tailor')}
                >
                  <MaterialCommunityIcons name="needle" size={20} color={newStaffRole === 'tailor' ? COLORS.white : COLORS.gray} />
                  <Text style={[styles.roleOptionText, newStaffRole === 'tailor' && styles.roleOptionTextActive]}>Tailor</Text>
                </TouchableOpacity>
              </View>
            </View>

            <GoldButton title="Add Staff" onPress={handleAddStaff} style={styles.modalButton} />
          </View>
        </View>
      </Modal>

      {/* Assign Work Modal */}
      <Modal visible={showAssignModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Work to {selectedStaff?.name}</Text>
              <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.black} />
              </TouchableOpacity>
            </View>

            {/* Search Orders */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={COLORS.gray} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search orders..."
                placeholderTextColor={COLORS.gray}
                value={orderSearch}
                onChangeText={setOrderSearch}
              />
            </View>

            {/* Orders List */}
            {ordersLoading ? (
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 20 }} />
            ) : (
              <FlatList
                data={filteredOrders}
                keyExtractor={(item) => item.id}
                style={styles.ordersList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.orderItem, selectedOrder?.id === item.id && styles.orderItemSelected]}
                    onPress={() => setSelectedOrder(item)}
                  >
                    <View>
                      <Text style={styles.orderCustomer}>{item.customer_name}</Text>
                      <Text style={styles.orderGarment}>{item.garment_type}</Text>
                    </View>
                    <Text style={styles.orderNumber}>#{item.order_number}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.noOrdersText}>No orders found</Text>
                }
              />
            )}

            {/* Stage Selection */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Stage</Text>
              <View style={styles.stageSelector}>
                {(['Cutting', 'Stitching', 'Assigned'] as const).map((stage) => (
                  <TouchableOpacity
                    key={stage}
                    style={[styles.stageOption, assignStage === stage && { backgroundColor: getStageColor(stage) }]}
                    onPress={() => setAssignStage(stage)}
                  >
                    <Text style={[styles.stageOptionText, assignStage === stage && { color: COLORS.black }]}>{stage}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Notes */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.formInput, { height: 60 }]}
                placeholder="Add notes..."
                placeholderTextColor={COLORS.gray}
                value={assignNotes}
                onChangeText={setAssignNotes}
                multiline
              />
            </View>

            <GoldButton title="Assign" onPress={handleAssign} style={styles.modalButton} />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl * 2,
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOWS.medium,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: COLORS.lightGray,
    marginVertical: SPACING.xs,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.black,
    marginTop: SPACING.xs,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.gray,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  staffCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  staffHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  staffInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
  },
  piecesText: {
    fontSize: 13,
    color: COLORS.gray,
  },
  staffActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    gap: 4,
  },
  assignButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  deleteButton: {
    padding: SPACING.xs,
  },
  assignmentsList: {
    marginTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    paddingTop: SPACING.md,
  },
  assignmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  assignmentInfo: {
    flex: 1,
  },
  assignmentCustomer: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
  },
  assignmentGarment: {
    fontSize: 13,
    color: COLORS.gray,
  },
  stageBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
    marginTop: 4,
  },
  stageText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.black,
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    gap: 4,
  },
  doneButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  noAssignments: {
    fontSize: 13,
    color: COLORS.gray,
    fontStyle: 'italic',
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  emptyCard: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: SPACING.sm,
  },
  addLink: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
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
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  formGroup: {
    marginBottom: SPACING.md,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: SPACING.xs,
  },
  formInput: {
    backgroundColor: COLORS.cream,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.cream,
    gap: SPACING.xs,
  },
  roleOptionActive: {
    backgroundColor: COLORS.primary,
  },
  roleOptionText: {
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: '600',
  },
  roleOptionTextActive: {
    color: COLORS.white,
  },
  modalButton: {
    marginTop: SPACING.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cream,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SPACING.sm,
    marginLeft: SPACING.sm,
    fontSize: 16,
  },
  ordersList: {
    maxHeight: 200,
    marginBottom: SPACING.md,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.cream,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  orderItemSelected: {
    backgroundColor: COLORS.primary + '20',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  orderCustomer: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
  },
  orderGarment: {
    fontSize: 13,
    color: COLORS.gray,
  },
  orderNumber: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },
  noOrdersText: {
    textAlign: 'center',
    color: COLORS.gray,
    paddingVertical: SPACING.lg,
  },
  stageSelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  stageOption: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.cream,
    alignItems: 'center',
  },
  stageOptionText: {
    fontSize: 13,
    color: COLORS.gray,
    fontWeight: '600',
  },
});
