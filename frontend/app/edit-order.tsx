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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
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

export default function EditOrderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const orderId = params.orderId as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  
  const [orderType, setOrderType] = useState('');
  const [description, setDescription] = useState('');
  const [materialPhotos, setMaterialPhotos] = useState<string[]>([]);
  const [orderDate, setOrderDate] = useState(new Date());
  const [deliveryDate, setDeliveryDate] = useState(new Date());
  const [showOrderDatePicker, setShowOrderDatePicker] = useState(false);
  const [showDeliveryDatePicker, setShowDeliveryDatePicker] = useState(false);
  const [voiceInstructions, setVoiceInstructions] = useState('');
  
  const [finalAmount, setFinalAmount] = useState('');
  const [advancePaid, setAdvancePaid] = useState('');
  const [paymentId, setPaymentId] = useState<string | null>(null);

  useEffect(() => {
    loadOrderData();
  }, []);

  const loadOrderData = async () => {
    try {
      const [order, payment] = await Promise.all([
        api.getOrder(orderId),
        api.getOrderPayment(orderId).catch(() => null),
      ]);
      
      // Set order data
      setOrderType(order.order_type);
      setDescription(order.description || '');
      setMaterialPhotos(order.material_photos || []);
      setOrderDate(new Date(order.order_date));
      setDeliveryDate(new Date(order.delivery_date));
      setVoiceInstructions(order.voice_instructions || '');
      
      // Set customer
      if (order.customer_id) {
        try {
          const customer = await api.getCustomer(order.customer_id);
          setSelectedCustomer(customer);
        } catch (e) {
          console.log('Customer not found');
        }
      }
      
      // Set payment data
      if (payment) {
        setFinalAmount(String(payment.final_amount || ''));
        setAdvancePaid(String(payment.advance_paid || ''));
        setPaymentId(payment.id);
      }
      
      // Fetch customers for picker
      fetchCustomers();
    } catch (error) {
      console.error('Failed to load order:', error);
      Alert.alert('Error', 'Failed to load order');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async (search?: string) => {
    try {
      const data = await api.getCustomers(search);
      setCustomers(data);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
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
    if (!orderType.trim()) {
      Alert.alert('Error', 'Please enter order type');
      return;
    }

    setSaving(true);
    try {
      // Update order
      await api.updateOrder(orderId, {
        order_type: orderType.trim(),
        description: description.trim(),
        material_photos: materialPhotos,
        delivery_date: deliveryDate.toISOString(),
        voice_instructions: voiceInstructions.trim(),
      });

      // Update/create payment if amounts provided
      if (finalAmount) {
        if (paymentId) {
          await api.updatePayment(paymentId, {
            final_amount: parseFloat(finalAmount) || 0,
            advance_paid: parseFloat(advancePaid) || 0,
          });
        } else {
          await api.createPayment({
            order_id: orderId,
            final_amount: parseFloat(finalAmount) || 0,
            advance_paid: parseFloat(advancePaid) || 0,
          });
        }
      }

      Alert.alert('Success', 'Order updated successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  const balanceAmount = (parseFloat(finalAmount) || 0) - (parseFloat(advancePaid) || 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[COLORS.cream, '#FFF5E6', COLORS.cream]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading order...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
            <Feather name="arrow-left" size={24} color={COLORS.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Order</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Customer Info (Read-only) */}
          <GlassCard style={styles.section}>
            <Text style={styles.sectionTitle}>Customer</Text>
            {selectedCustomer ? (
              <View style={styles.customerInfo}>
                <View style={styles.customerAvatar}>
                  <Ionicons name="person" size={20} color={COLORS.gray} />
                </View>
                <View>
                  <Text style={styles.customerName}>{selectedCustomer.name}</Text>
                  <Text style={styles.customerPhone}>{selectedCustomer.phone}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.placeholderText}>Customer not found</Text>
            )}
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
            title="Update Order"
            onPress={handleSubmit}
            loading={saving}
            style={styles.submitButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Pickers */}
      {showOrderDatePicker && (
        <DateTimePicker
          value={orderDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowOrderDatePicker(Platform.OS === 'ios');
            if (event.type === 'set' && date) setOrderDate(date);
            if (Platform.OS === 'android') setShowOrderDatePicker(false);
          }}
        />
      )}
      {showDeliveryDatePicker && (
        <DateTimePicker
          value={deliveryDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={orderDate}
          onChange={(event, date) => {
            setShowDeliveryDatePicker(Platform.OS === 'ios');
            if (event.type === 'set' && date) setDeliveryDate(date);
            if (Platform.OS === 'android') setShowDeliveryDatePicker(false);
          }}
        />
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: COLORS.gray,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  backButton: {
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
  headerRight: {
    width: 44,
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
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cream,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
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
    padding: SPACING.md,
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
});
