import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../src/constants/theme';
import { GlassCard } from '../src/components/GlassCard';
import { GoldButton } from '../src/components/GoldButton';
import { api } from '../src/services/api';

export default function AddMeasurementScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const customerId = params.customerId as string;

  const [category, setCategory] = useState<'Top' | 'Bottom'>('Top');
  const [loading, setLoading] = useState(false);
  const [referencePhotos, setReferencePhotos] = useState<string[]>([]);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Top measurements
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
    dot_point: '',
    dot_to_dot: '',
    slit_length: '',
    seat_round: '',
  });

  // Bottom measurements
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
    { key: 'sleeve_length', label: 'Sleeve Length' },
    { key: 'sleeve_round', label: 'Sleeve Round' },
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

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const startRecording = async (fieldKey: string) => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please grant microphone permission to use voice input.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
      setIsRecording(true);
      setActiveField(fieldKey);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recording || !activeField) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (uri) {
        // Read audio file as base64
        const base64Audio = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Send to backend for transcription
        try {
          const result = await api.transcribeVoice(base64Audio, 'm4a');
          if (result.success && result.text) {
            // Extract number from voice input
            const number = result.text.match(/[\d.]+/)?.[0] || result.text;
            
            // Update the measurement field
            if (category === 'Top') {
              setTopMeasurements(prev => ({ ...prev, [activeField]: number }));
            } else {
              setBottomMeasurements(prev => ({ ...prev, [activeField]: number }));
            }
            
            // Auto-move to next field
            const currentFields = category === 'Top' ? topFields : bottomFields;
            const currentIndex = currentFields.findIndex(f => f.key === activeField);
            if (currentIndex < currentFields.length - 1) {
              const nextField = currentFields[currentIndex + 1];
              Alert.alert(
                'Measurement Recorded',
                `${activeField.replace(/_/g, ' ')}: ${number}"\n\nMove to next: ${nextField.label}?`,
                [
                  { text: 'Stop', style: 'cancel', onPress: () => setActiveField(null) },
                  { text: 'Next', onPress: () => startRecording(nextField.key) },
                ]
              );
            } else {
              Alert.alert('Success', `${activeField.replace(/_/g, ' ')}: ${number}"`);
              setActiveField(null);
            }
          } else {
            Alert.alert('Error', 'Could not transcribe. Please try again.');
          }
        } catch (error) {
          console.error('Transcription error:', error);
          Alert.alert('Error', 'Failed to transcribe audio');
        }
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
    setActiveField(null);
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
      setReferencePhotos([...referencePhotos, ...newPhotos]);
    }
  };

  const handleSubmit = async () => {
    if (!customerId) {
      Alert.alert('Error', 'Customer ID is required');
      return;
    }

    setLoading(true);
    try {
      const measurements = category === 'Top' ? topMeasurements : bottomMeasurements;
      const hasValues = Object.values(measurements).some(v => v !== '');
      
      if (!hasValues) {
        Alert.alert('Error', 'Please enter at least one measurement');
        setLoading(false);
        return;
      }

      const formattedMeasurements = Object.fromEntries(
        Object.entries(measurements).map(([k, v]) => [k, v ? parseFloat(v) : 0])
      );

      await api.createMeasurement({
        customer_id: customerId,
        category,
        top_measurements: category === 'Top' ? formattedMeasurements : null,
        bottom_measurements: category === 'Bottom' ? formattedMeasurements : null,
        reference_photos: referencePhotos,
        added_by_voice: true,
      });

      Alert.alert('Success', 'Measurement added successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add measurement');
    } finally {
      setLoading(false);
    }
  };

  const MeasurementInput = ({ field, value, onChange }: { 
    field: { key: string; label: string }; 
    value: string; 
    onChange: (v: string) => void 
  }) => {
    const isActive = activeField === field.key && isRecording;
    
    return (
      <View style={styles.measurementInput}>
        <View style={styles.inputHeader}>
          <Text style={styles.inputLabel}>{field.label}</Text>
        </View>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, isActive && styles.inputActive]}
            placeholder="0"
            placeholderTextColor={COLORS.gray}
            value={value}
            onChangeText={onChange}
            keyboardType="numeric"
          />
          <TouchableOpacity
            style={[
              styles.voiceMiniButton,
              isActive && styles.voiceMiniButtonActive
            ]}
            onPress={() => {
              if (isActive) {
                stopRecording();
              } else {
                startRecording(field.key);
              }
            }}
          >
            <Animated.View style={isActive ? { transform: [{ scale: pulseAnim }] } : {}}>
              <MaterialCommunityIcons
                name={isActive ? "stop" : "microphone"}
                size={18}
                color={isActive ? COLORS.white : COLORS.primary}
              />
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>
    );
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
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={COLORS.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Measurement</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Category Toggle */}
          <View style={styles.categoryToggle}>
            <TouchableOpacity
              style={[styles.categoryButton, category === 'Top' && styles.categoryButtonActive]}
              onPress={() => setCategory('Top')}
            >
              <MaterialCommunityIcons
                name="tshirt-crew"
                size={20}
                color={category === 'Top' ? COLORS.white : COLORS.gray}
              />
              <Text style={[styles.categoryText, category === 'Top' && styles.categoryTextActive]}>
                Top
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.categoryButton, category === 'Bottom' && styles.categoryButtonActive]}
              onPress={() => setCategory('Bottom')}
            >
              <MaterialCommunityIcons
                name="human-male"
                size={20}
                color={category === 'Bottom' ? COLORS.white : COLORS.gray}
              />
              <Text style={[styles.categoryText, category === 'Bottom' && styles.categoryTextActive]}>
                Bottom
              </Text>
            </TouchableOpacity>
          </View>

          {/* Live Voice Entry Section */}
          <GlassCard style={styles.voiceEntryCard}>
            <View style={styles.voiceEntryHeader}>
              <LinearGradient
                colors={[COLORS.primary, '#991B1B']}
                style={styles.voiceEntryIcon}
              >
                <MaterialCommunityIcons name="microphone" size={28} color={COLORS.white} />
              </LinearGradient>
              <View>
                <Text style={styles.voiceEntryTitle}>Live Voice Entry</Text>
                <Text style={styles.voiceEntrySubtitle}>
                  Tap mic icon next to any field
                </Text>
              </View>
            </View>
            {isRecording && (
              <View style={styles.recordingIndicator}>
                <Animated.View style={[styles.recordingDot, { transform: [{ scale: pulseAnim }] }]} />
                <Text style={styles.recordingText}>
                  Recording for: {activeField?.replace(/_/g, ' ')}
                </Text>
                <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
                  <Text style={styles.stopButtonText}>STOP</Text>
                </TouchableOpacity>
              </View>
            )}
          </GlassCard>

          {/* Measurements Grid */}
          <GlassCard style={styles.measurementsCard}>
            <Text style={styles.sectionTitle}>{category} Measurements</Text>
            <View style={styles.measurementsGrid}>
              {(category === 'Top' ? topFields : bottomFields).map((field) => (
                <MeasurementInput
                  key={field.key}
                  field={field}
                  value={category === 'Top' 
                    ? topMeasurements[field.key as keyof typeof topMeasurements] 
                    : bottomMeasurements[field.key as keyof typeof bottomMeasurements]}
                  onChange={(v) => {
                    if (category === 'Top') {
                      setTopMeasurements(prev => ({ ...prev, [field.key]: v }));
                    } else {
                      setBottomMeasurements(prev => ({ ...prev, [field.key]: v }));
                    }
                  }}
                />
              ))}
            </View>
          </GlassCard>

          {/* Reference Photos */}
          <GlassCard style={styles.section}>
            <Text style={styles.sectionTitle}>Reference Photos</Text>
            <View style={styles.photosGrid}>
              {referencePhotos.map((photo, index) => (
                <View key={index} style={styles.photoItem}>
                  <Image source={{ uri: photo }} style={styles.photoImage} />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => setReferencePhotos(referencePhotos.filter((_, i) => i !== index))}
                  >
                    <Ionicons name="close-circle" size={24} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addPhotoButton} onPress={pickImage}>
                <Feather name="plus" size={32} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
          </GlassCard>

          <GoldButton
            title="Save Measurement"
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitButton}
          />
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
    width: 44,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  categoryToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: 4,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  categoryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  categoryButtonActive: {
    backgroundColor: COLORS.primary,
  },
  categoryText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray,
  },
  categoryTextActive: {
    color: COLORS.white,
  },
  voiceEntryCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.primary + '30',
  },
  voiceEntryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  voiceEntryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceEntryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  voiceEntrySubtitle: {
    fontSize: 13,
    color: COLORS.gray,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.error,
  },
  recordingText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  stopButton: {
    backgroundColor: COLORS.error,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  stopButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 12,
  },
  measurementsCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: SPACING.md,
  },
  measurementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  measurementInput: {
    width: '31%',
  },
  inputHeader: {
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.gray,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 4,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.cream,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    textAlign: 'center',
  },
  inputActive: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  voiceMiniButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.cream,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  voiceMiniButtonActive: {
    backgroundColor: COLORS.primary,
  },
  section: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
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
  submitButton: {
    marginTop: SPACING.md,
  },
});
