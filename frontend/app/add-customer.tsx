import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../src/constants/theme';
import { GlassCard } from '../src/components/GlassCard';
import { GoldButton } from '../src/components/GoldButton';
import { VoiceButton } from '../src/components/VoiceButton';
import { api } from '../src/services/api';

import { useAuth } from '../src/context/AuthContext';

export default function AddCustomerScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [photo, setPhoto] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [measurementCategory, setMeasurementCategory] = useState<'Top' | 'Bottom'>('Top');
  
  // Measurement states
  const [topMeasurements, setTopMeasurements] = useState({
    full_length: '',
    shoulder: '',
    upper_chest: '',
    bust: '',
    waist: '',
    front_deep: '',
    back_deep: '',
    sleeve_length: '',
    sleeve_round: '',
    arm_hole: '',
    biceps: '',
    dot_point: '',
    dot_to_dot: '',
    slit_length: '',
    seat_round: '',
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
    { key: 'front_deep', label: 'Front Deep' },
    { key: 'back_deep', label: 'Back Deep' },
    { key: 'sleeve_length', label: 'Sleeve Length' },
    { key: 'sleeve_round', label: 'Sleeve Around' },
    { key: 'arm_hole', label: 'Arm Hole' },
    { key: 'biceps', label: 'Biceps' },
    { key: 'dot_point', label: 'Dot Point' },
    { key: 'dot_to_dot', label: 'Dot to Dot' },
    { key: 'slit_length', label: 'Slit Length' },
    { key: 'seat_round', label: 'Seat Round' },
  ];

  const bottomFields = [
    { key: 'length', label: 'Length' },
    { key: 'hip_round', label: 'Hip Round' },
    { key: 'thighs', label: 'Thighs' },
    { key: 'knees', label: 'Knees' },
    { key: 'ankle', label: 'Ankle' },
  ];

  const handleTopMeasurementChange = (key: string, value: string) => {
    setTopMeasurements(prev => ({ ...prev, [key]: value }));
  };

  const handleBottomMeasurementChange = (key: string, value: string) => {
    setBottomMeasurements(prev => ({ ...prev, [key]: value }));
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please grant camera roll permission');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please grant camera permission');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleVoiceInput = (text: string) => {
    if (activeField === 'name') {
      setName(text);
    } else if (activeField === 'phone') {
      setPhone(text.replace(/\D/g, ''));
    } else if (activeField === 'address') {
      setAddress(text);
    } else if (activeField === 'notes') {
      setNotes(text);
    }
    setActiveField(null);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter customer name');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter phone number');
      return;
    }

    setLoading(true);
    try {
      console.log('Creating customer...');
      const customer = await api.createCustomer({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        photo,
        notes: notes.trim(),
        user_id: user?.user_id || null,
      });
      console.log('Customer created successfully!');
      
      // If measurements were added, save them too
      const hasTopMeasurements = Object.values(topMeasurements).some(v => v !== '');
      const hasBottomMeasurements = Object.values(bottomMeasurements).some(v => v !== '');
      
      if (hasTopMeasurements || hasBottomMeasurements) {
        try {
          console.log('Saving measurements...');
          // Filter out empty values and convert to numbers
          const cleanTopMeasurements = Object.fromEntries(
            Object.entries(topMeasurements)
              .filter(([_, v]) => v !== '' && v !== null)
              .map(([k, v]) => [k, parseFloat(v as string) || 0])
          );
          const cleanBottomMeasurements = Object.fromEntries(
            Object.entries(bottomMeasurements)
              .filter(([_, v]) => v !== '' && v !== null)
              .map(([k, v]) => [k, parseFloat(v as string) || 0])
          );
          
          // Save top measurements if any
          if (hasTopMeasurements && Object.keys(cleanTopMeasurements).length > 0) {
            await api.createMeasurement({
              customer_id: customer.id,
              category: 'Top',
              top_measurements: cleanTopMeasurements,
              bottom_measurements: null,
              reference_photos: [],
            });
          }
          // Save bottom measurements if any
          if (hasBottomMeasurements && Object.keys(cleanBottomMeasurements).length > 0) {
            await api.createMeasurement({
              customer_id: customer.id,
              category: 'Bottom',
              top_measurements: null,
              bottom_measurements: cleanBottomMeasurements,
              reference_photos: [],
            });
          }
          console.log('Measurements saved!');
        } catch (measurementError) {
          console.log('Measurement save error (customer still created):', measurementError);
          // Don't throw - customer was created successfully
        }
      }
      
      Alert.alert('Success', 'Customer added successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Error creating customer:', error);
      let errorMessage = 'Failed to add customer';
      
      // Handle different error types
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error?.message && typeof error.message === 'string') {
        errorMessage = error.message;
      } else if (error?.detail) {
        errorMessage = typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail);
      } else if (typeof error === 'object') {
        try {
          errorMessage = JSON.stringify(error);
        } catch {
          errorMessage = 'An unknown error occurred';
        }
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
          <Text style={styles.headerTitle}>Add Customer</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Photo Section */}
          <View style={styles.photoSection}>
            <TouchableOpacity
              style={styles.photoContainer}
              onPress={() => {
                Alert.alert('Add Photo', 'Choose an option', [
                  { text: 'Camera', onPress: takePhoto },
                  { text: 'Gallery', onPress: pickImage },
                  { text: 'Cancel', style: 'cancel' },
                ]);
              }}
            >
              {photo ? (
                <Image source={{ uri: photo }} style={styles.photo} />
              ) : (
                <>
                  <Ionicons name="camera" size={32} color={COLORS.gray} />
                  <Text style={styles.photoText}>Add Photo</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <GlassCard style={styles.formCard}>
            {/* Name Input */}
            <View style={styles.inputGroup}>
              <View style={styles.inputHeader}>
                <Text style={styles.inputLabel}>Name *</Text>
                <TouchableOpacity
                  style={styles.voiceInputButton}
                  onPress={() => setActiveField(activeField === 'name' ? null : 'name')}
                >
                  <Ionicons
                    name="mic"
                    size={20}
                    color={activeField === 'name' ? COLORS.primary : COLORS.gray}
                  />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Enter customer name"
                placeholderTextColor={COLORS.gray}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Phone Input */}
            <View style={styles.inputGroup}>
              <View style={styles.inputHeader}>
                <Text style={styles.inputLabel}>Phone *</Text>
                <TouchableOpacity
                  style={styles.voiceInputButton}
                  onPress={() => setActiveField(activeField === 'phone' ? null : 'phone')}
                >
                  <Ionicons
                    name="mic"
                    size={20}
                    color={activeField === 'phone' ? COLORS.primary : COLORS.gray}
                  />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Enter phone number"
                placeholderTextColor={COLORS.gray}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            {/* Address Input */}
            <View style={styles.inputGroup}>
              <View style={styles.inputHeader}>
                <Text style={styles.inputLabel}>Address</Text>
                <TouchableOpacity
                  style={styles.voiceInputButton}
                  onPress={() => setActiveField(activeField === 'address' ? null : 'address')}
                >
                  <Ionicons
                    name="mic"
                    size={20}
                    color={activeField === 'address' ? COLORS.primary : COLORS.gray}
                  />
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter address"
                placeholderTextColor={COLORS.gray}
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Notes Input */}
            <View style={styles.inputGroup}>
              <View style={styles.inputHeader}>
                <Text style={styles.inputLabel}>Notes</Text>
                <TouchableOpacity
                  style={styles.voiceInputButton}
                  onPress={() => setActiveField(activeField === 'notes' ? null : 'notes')}
                >
                  <Ionicons
                    name="mic"
                    size={20}
                    color={activeField === 'notes' ? COLORS.primary : COLORS.gray}
                  />
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add any notes"
                placeholderTextColor={COLORS.gray}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Voice Input */}
            {activeField && (
              <View style={styles.voiceSection}>
                <Text style={styles.voiceLabel}>Speak for {activeField}</Text>
                <VoiceButton onTranscription={handleVoiceInput} />
              </View>
            )}

            {/* Measurements Section */}
            <TouchableOpacity 
              style={styles.measurementToggle}
              onPress={() => setShowMeasurements(!showMeasurements)}
            >
              <View style={styles.measurementToggleLeft}>
                <MaterialCommunityIcons name="tape-measure" size={24} color={COLORS.primary} />
                <Text style={styles.measurementToggleText}>Add Measurements</Text>
              </View>
              <Ionicons 
                name={showMeasurements ? "chevron-up" : "chevron-down"} 
                size={24} 
                color={COLORS.gray} 
              />
            </TouchableOpacity>

            {showMeasurements && (
              <View style={styles.measurementSection}>
                {/* Category Tabs */}
                <View style={styles.categoryTabs}>
                  <TouchableOpacity
                    style={[styles.categoryTab, measurementCategory === 'Top' && styles.categoryTabActive]}
                    onPress={() => setMeasurementCategory('Top')}
                  >
                    <MaterialCommunityIcons 
                      name="tshirt-crew" 
                      size={20} 
                      color={measurementCategory === 'Top' ? COLORS.white : COLORS.gray} 
                    />
                    <Text style={[styles.categoryTabText, measurementCategory === 'Top' && styles.categoryTabTextActive]}>
                      Top
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.categoryTab, measurementCategory === 'Bottom' && styles.categoryTabActive]}
                    onPress={() => setMeasurementCategory('Bottom')}
                  >
                    <MaterialCommunityIcons 
                      name="tshirt-v" 
                      size={20} 
                      color={measurementCategory === 'Bottom' ? COLORS.white : COLORS.gray} 
                    />
                    <Text style={[styles.categoryTabText, measurementCategory === 'Bottom' && styles.categoryTabTextActive]}>
                      Bottom
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Measurement Fields */}
                <View style={styles.measurementGrid}>
                  {measurementCategory === 'Top' ? (
                    topFields.map((field) => (
                      <View key={field.key} style={styles.measurementInput}>
                        <Text style={styles.measurementLabel}>{field.label}</Text>
                        <TextInput
                          style={styles.measurementInputField}
                          placeholder="0"
                          placeholderTextColor={COLORS.gray}
                          value={topMeasurements[field.key as keyof typeof topMeasurements]}
                          onChangeText={(v) => handleTopMeasurementChange(field.key, v)}
                          keyboardType="numeric"
                        />
                      </View>
                    ))
                  ) : (
                    bottomFields.map((field) => (
                      <View key={field.key} style={styles.measurementInput}>
                        <Text style={styles.measurementLabel}>{field.label}</Text>
                        <TextInput
                          style={styles.measurementInputField}
                          placeholder="0"
                          placeholderTextColor={COLORS.gray}
                          value={bottomMeasurements[field.key as keyof typeof bottomMeasurements]}
                          onChangeText={(v) => handleBottomMeasurementChange(field.key, v)}
                          keyboardType="numeric"
                        />
                      </View>
                    ))
                  )}
                </View>
              </View>
            )}

            <GoldButton
              title="Add Customer"
              onPress={handleSubmit}
              loading={loading}
              style={styles.submitButton}
            />
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
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
    width: 40,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  photoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoText: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  formCard: {
    padding: SPACING.lg,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
  },
  voiceInputButton: {
    padding: 4,
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
  voiceSection: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    marginTop: SPACING.md,
  },
  voiceLabel: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: SPACING.md,
  },
  submitButton: {
    marginTop: SPACING.lg,
  },
  measurementToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.cream,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  measurementToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  measurementToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  measurementSection: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  categoryTabs: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  categoryTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.cream,
    gap: SPACING.xs,
  },
  categoryTabActive: {
    backgroundColor: COLORS.primary,
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
  },
  categoryTabTextActive: {
    color: COLORS.white,
  },
  measurementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  measurementInput: {
    width: '48%',
    marginBottom: SPACING.md,
  },
  measurementLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: SPACING.xs,
  },
  measurementInputField: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    fontSize: 16,
    color: COLORS.black,
  },
});
