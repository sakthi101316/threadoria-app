import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../src/constants/theme';
import { GlassCard } from '../src/components/GlassCard';
import { GoldButton } from '../src/components/GoldButton';
import { api } from '../src/services/api';
import { format } from 'date-fns';

interface Customer {
  id: string;
  name: string;
  phone: string;
}

export default function AddOrderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  
  const [orderType, setOrderType] = useState('');
  const [description, setDescription] = useState('');
  const [materialPhotos, setMaterialPhotos] = useState<string[]>([]);
  const [orderDate, setOrderDate] = useState(new Date());
  const [deliveryDate, setDeliveryDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [showOrderDatePicker, setShowOrderDatePicker] = useState(false);
  const [showDeliveryDatePicker, setShowDeliveryDatePicker] = useState(false);
  const [voiceInstructions, setVoiceInstructions] = useState('');
  
  const [finalAmount, setFinalAmount] = useState('');
  const [advancePaid, setAdvancePaid] = useState('');
  
  const [loading, setLoading] = useState(false);

  // Measurements state
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [measurementCategory, setMeasurementCategory] = useState<'Top' | 'Bottom'>('Top');
  const [topMeasurements, setTopMeasurements] = useState({
    full_length: '',
    shoulder: '',
    upper_chest: '',
    bust: '',
    waist: '',
    sleeve_length: '',
    sleeve_round: '',
    arm_hole: '',
    biceps: '',
  });
  const [bottomMeasurements, setBottomMeasurements] = useState({
    length: '',
    hip_round: '',
    thighs: '',
    knees: '',
    ankle: '',
  });

  const topFields = [
    { key: 'full_length', label: 'Full Length' },
    { key: 'shoulder', label: 'Shoulder' },
    { key: 'upper_chest', label: 'Upper Chest' },
    { key: 'bust', label: 'Bust' },
    { key: 'waist', label: 'Waist' },
    { key: 'sleeve_length', label: 'Sleeve' },
    { key: 'sleeve_round', label: 'Sleeve R.' },
    { key: 'arm_hole', label: 'Arm Hole' },
    { key: 'biceps', label: 'Biceps' },
  ];

  const bottomFields = [
    { key: 'length', label: 'Length' },
    { key: 'hip_round', label: 'Hip Round' },
    { key: 'thighs', label: 'Thighs' },
    { key: 'knees', label: 'Knees' },
    { key: 'ankle', label: 'Ankle' },
  ];

  useEffect(() => {
    fetchCustomers();
    if (params.customerId) {
      loadCustomer(params.customerId as string);
    }
  }, []);

  const fetchCustomers = async (search?: string) => {
    try {
      const data = await api.getCustomers(search);
      setCustomers(data);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    }
  };

  const loadCustomer = async (id: string) => {
    try {
      const customer = await api.getCustomer(id);
      setSelectedCustomer(customer);
    } catch (error) {
      console.error('Failed to load customer:', error);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      const newPhotos = result.assets
        .filter(asset => asset.base64)
        .map(asset => `data:image/jpeg;base64,${asset.base64}`);
      setMaterialPhotos([...materialPhotos, ...newPhotos]);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please grant camera permission');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setMaterialPhotos([...materialPhotos, `data:image/jpeg;base64,${result.assets[0].base64}`]);
    }
  };

  const removePhoto = (index: number) => {
    setMaterialPhotos(materialPhotos.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedCustomer) {
      Alert.alert('Error', 'Please select a customer');
      return;
    }
    if (!orderType.trim()) {
      Alert.alert('Error', 'Please enter order type');
      return;
    }

    setLoading(true);
    try {
      const order = await api.createOrder({
        customer_id: selectedCustomer.id,
        order_type: orderType.trim(),
        description: description.trim(),
        material_photos: materialPhotos,
        order_date: orderDate.toISOString(),
        delivery_date: deliveryDate.toISOString(),
        voice_instructions: voiceInstructions.trim(),
        auto_created_by_voice: false,
      });

      // Create payment if amounts provided
      if (finalAmount) {
        await api.createPayment({
          order_id: order.id,
          final_amount: parseFloat(finalAmount) || 0,
          advance_paid: parseFloat(advancePaid) || 0,
        });
      }

      Alert.alert('Success', 'Order created successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const balanceAmount = (parseFloat(finalAmount) || 0) - (parseFloat(advancePaid) || 0);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[COLORS.cream, '#FFF5E6', COLORS.cream]}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Order</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Customer Selection */}
          <GlassCard style={styles.section}>
            <Text style={styles.sectionTitle}>Customer</Text>
            <TouchableOpacity
              style={styles.customerSelector}
              onPress={() => setShowCustomerPicker(true)}
            >
              {selectedCustomer ? (
                <View style={styles.selectedCustomer}>
                  <View style={styles.customerAvatar}>
                    <Ionicons name="person" size={20} color={COLORS.gray} />
                  </View>
                  <View>
                    <Text style={styles.customerName}>{selectedCustomer.name}</Text>
                    <Text style={styles.customerPhone}>{selectedCustomer.phone}</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.placeholderText}>Select customer</Text>
              )}
              <Ionicons name="chevron-down" size={24} color={COLORS.gray} />
            </TouchableOpacity>
          </GlassCard>

          {/* Order Details */}
          <GlassCard style={styles.section}>
            <Text style={styles.sectionTitle}>Order Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Order Type *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Blouse, Saree, Suit"
                placeholderTextColor={COLORS.gray}
                value={orderType}
                onChangeText={setOrderType}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter order details"
                placeholderTextColor={COLORS.gray}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Voice Instructions</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any special instructions"
                placeholderTextColor={COLORS.gray}
                value={voiceInstructions}
                onChangeText={setVoiceInstructions}
                multiline
                numberOfLines={2}
              />
            </View>
          </GlassCard>

          {/* Dates */}
          <GlassCard style={styles.section}>
            <Text style={styles.sectionTitle}>Dates</Text>
            
            <View style={styles.dateRow}>
              <View style={styles.dateColumn}>
                <Text style={styles.inputLabel}>Order Date</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowOrderDatePicker(true)}
                >
                  <Ionicons name="calendar" size={20} color={COLORS.primary} />
                  <Text style={styles.dateText}>{format(orderDate, 'dd MMM yyyy')}</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.dateColumn}>
                <Text style={styles.inputLabel}>Delivery Date</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDeliveryDatePicker(true)}
                >
                  <Ionicons name="gift" size={20} color={COLORS.primary} />
                  <Text style={styles.dateText}>{format(deliveryDate, 'dd MMM yyyy')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </GlassCard>

          {/* Material Photos */}
          <GlassCard style={styles.section}>
            <Text style={styles.sectionTitle}>Material Photos</Text>
            
            <View style={styles.photosGrid}>
              {materialPhotos.map((photo, index) => (
                <View key={index} style={styles.photoItem}>
                  <Image source={{ uri: photo }} style={styles.photoImage} />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => removePhoto(index)}
                  >
                    <Ionicons name="close-circle" size={24} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                style={styles.addPhotoButton}
                onPress={() => {
                  Alert.alert('Add Photo', 'Choose an option', [
                    { text: 'Camera', onPress: takePhoto },
                    { text: 'Gallery', onPress: pickImage },
                    { text: 'Cancel', style: 'cancel' },
                  ]);
                }}
              >
                <Ionicons name="add" size={32} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
          </GlassCard>

          {/* Payment */}
          <GlassCard style={styles.section}>
            <Text style={styles.sectionTitle}>Payment</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Final Amount</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={COLORS.gray}
                value={finalAmount}
                onChangeText={setFinalAmount}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Advance Paid</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={COLORS.gray}
                value={advancePaid}
                onChangeText={setAdvancePaid}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>Balance Amount</Text>
              <Text style={[styles.balanceValue, balanceAmount > 0 && { color: COLORS.error }]}>
                Rs. {balanceAmount.toFixed(2)}
              </Text>
            </View>
          </GlassCard>

          <GoldButton
            title="Create Order"
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Customer Picker Modal */}
      <Modal visible={showCustomerPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Customer</Text>
              <TouchableOpacity onPress={() => setShowCustomerPicker(false)}>
                <Ionicons name="close" size={24} color={COLORS.black} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={COLORS.gray} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search customers..."
                placeholderTextColor={COLORS.gray}
                value={customerSearch}
                onChangeText={(text) => {
                  setCustomerSearch(text);
                  fetchCustomers(text);
                }}
              />
            </View>

            <FlatList
              data={customers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.customerItem}
                  onPress={() => {
                    setSelectedCustomer(item);
                    setShowCustomerPicker(false);
                  }}
                >
                  <View style={styles.customerAvatar}>
                    <Ionicons name="person" size={20} color={COLORS.gray} />
                  </View>
                  <View>
                    <Text style={styles.customerName}>{item.name}</Text>
                    <Text style={styles.customerPhone}>{item.phone}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No customers found</Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Date Pickers - Using Modal for better cross-platform support */}
      {showOrderDatePicker && (
        <Modal transparent animationType="fade" visible={showOrderDatePicker}>
          <View style={styles.dateModalOverlay}>
            <View style={styles.dateModalContent}>
              <View style={styles.dateModalHeader}>
                <Text style={styles.dateModalTitle}>Select Order Date</Text>
                <TouchableOpacity onPress={() => setShowOrderDatePicker(false)}>
                  <Ionicons name="close" size={24} color={COLORS.black} />
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={orderDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                onChange={(event, date) => {
                  if (Platform.OS === 'android') {
                    setShowOrderDatePicker(false);
                    if (event.type === 'set' && date) setOrderDate(date);
                  } else if (date) {
                    setOrderDate(date);
                  }
                }}
                style={{ width: '100%', height: 200 }}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity 
                  style={styles.dateModalButton}
                  onPress={() => setShowOrderDatePicker(false)}
                >
                  <Text style={styles.dateModalButtonText}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
      )}
      {showDeliveryDatePicker && (
        <Modal transparent animationType="fade" visible={showDeliveryDatePicker}>
          <View style={styles.dateModalOverlay}>
            <View style={styles.dateModalContent}>
              <View style={styles.dateModalHeader}>
                <Text style={styles.dateModalTitle}>Select Delivery Date</Text>
                <TouchableOpacity onPress={() => setShowDeliveryDatePicker(false)}>
                  <Ionicons name="close" size={24} color={COLORS.black} />
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={deliveryDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                minimumDate={orderDate}
                onChange={(event, date) => {
                  if (Platform.OS === 'android') {
                    setShowDeliveryDatePicker(false);
                    if (event.type === 'set' && date) setDeliveryDate(date);
                  } else if (date) {
                    setDeliveryDate(date);
                  }
                }}
                style={{ width: '100%', height: 200 }}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity 
                  style={styles.dateModalButton}
                  onPress={() => setShowDeliveryDatePicker(false)}
                >
                  <Text style={styles.dateModalButtonText}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
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
  headerRight: {
    width: 40,
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
  inputGroup: {
    marginBottom: SPACING.md,
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
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  customerSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.cream,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  selectedCustomer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
  },
  customerPhone: {
    fontSize: 14,
    color: COLORS.gray,
  },
  placeholderText: {
    fontSize: 16,
    color: COLORS.gray,
  },
  dateRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  dateColumn: {
    flex: 1,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cream,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    gap: SPACING.sm,
  },
  dateText: {
    fontSize: 14,
    color: COLORS.black,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  photoItem: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  addPhotoButton: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.gray,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  balanceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  submitButton: {
    marginTop: SPACING.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '80%',
    padding: SPACING.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cream,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SPACING.md,
    marginLeft: SPACING.sm,
    fontSize: 16,
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.gray,
    paddingVertical: SPACING.xl,
  },
  dateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    width: '90%',
    maxWidth: 400,
  },
  dateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  dateModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  dateModalButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  dateModalButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
