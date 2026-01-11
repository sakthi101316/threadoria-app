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

export default function AddCustomerScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [photo, setPhoto] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);

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
      await api.createCustomer({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        photo,
        notes: notes.trim(),
      });
      Alert.alert('Success', 'Customer added successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add customer');
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
            <Ionicons name="arrow-back" size={24} color={COLORS.black} />
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
});
