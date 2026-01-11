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

// Field name mappings for voice recognition
const FIELD_MAPPINGS: { [key: string]: string } = {
  'full length': 'full_length',
  'full': 'full_length',
  'length': 'full_length',
  'shoulder': 'shoulder',
  'shoulders': 'shoulder',
  'upper chest': 'upper_chest',
  'chest': 'upper_chest',
  'bust': 'bust',
  'waist': 'waist',
  'sleeve length': 'sleeve_length',
  'sleeve': 'sleeve_length',
  'sleeves': 'sleeve_length',
  'sleeve round': 'sleeve_round',
  'arm hole': 'arm_hole',
  'armhole': 'arm_hole',
  'biceps': 'biceps',
  'bicep': 'biceps',
  'dot point': 'dot_point',
  'dot': 'dot_point',
  'dot to dot': 'dot_to_dot',
  'slit length': 'slit_length',
  'slit': 'slit_length',
  'seat round': 'seat_round',
  'seat': 'seat_round',
  'hip round': 'hip_round',
  'hip': 'hip_round',
  'hips': 'hip_round',
  'thighs': 'thighs',
  'thigh': 'thighs',
  'knees': 'knees',
  'knee': 'knees',
  'ankle': 'ankle',
  'ankles': 'ankle',
};

export default function AddMeasurementScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const customerId = params.customerId as string;

  const [category, setCategory] = useState<'Top' | 'Bottom'>('Top');
  const [loading, setLoading] = useState(false);
  const [referencePhotos, setReferencePhotos] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [transcribedText, setTranscribedText] = useState('');
  const [filledFields, setFilledFields] = useState<string[]>([]);
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
            toValue: 1.2,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  // Parse voice input to extract field-value pairs
  const parseVoiceInput = (text: string) => {
    const lowerText = text.toLowerCase();
    const results: { field: string; value: string; label: string }[] = [];
    
    // Split by common separators
    const segments = lowerText.split(/[,\.\n]+/);
    
    for (const segment of segments) {
      // Try to match field name and number
      for (const [spoken, fieldKey] of Object.entries(FIELD_MAPPINGS)) {
        if (segment.includes(spoken)) {
          // Extract number after the field name
          const numberMatch = segment.match(/(\d+\.?\d*)/);
          if (numberMatch) {
            const field = topFields.find(f => f.key === fieldKey) || bottomFields.find(f => f.key === fieldKey);
            if (field) {
              results.push({
                field: fieldKey,
                value: numberMatch[1],
                label: field.label
              });
            }
          }
          break;
        }
      }
    }
    
    return results;
  };

  const startRecording = async () => {
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
      setTranscribedText('');
      setFilledFields([]);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

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
            setTranscribedText(result.text);
            
            // Parse the transcribed text
            const parsed = parseVoiceInput(result.text);
            
            if (parsed.length > 0) {
              const newFilledFields: string[] = [];
              
              // Update measurements based on parsed values
              parsed.forEach(({ field, value, label }) => {
                if (category === 'Top' && field in topMeasurements) {
                  setTopMeasurements(prev => ({ ...prev, [field]: value }));
                  newFilledFields.push(label);
                } else if (category === 'Bottom' && field in bottomMeasurements) {
                  setBottomMeasurements(prev => ({ ...prev, [field]: value }));
                  newFilledFields.push(label);
                }
              });
              
              setFilledFields(newFilledFields);
              
              Alert.alert(
                'Measurements Added',
                `Filled ${parsed.length} field(s):\n${parsed.map(p => `${p.label}: ${p.value}"`).join('\n')}`,
                [{ text: 'OK' }]
              );
            } else {
              Alert.alert(
                'Voice Input',
                `Transcribed: "${result.text}"\n\nCouldn't identify measurements. Try saying:\n"Full length 42, shoulder 14, bust 36"`,
                [{ text: 'Try Again', onPress: startRecording }, { text: 'OK' }]
              );
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
      Alert.alert('Error', 'Failed to stop recording');
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
    const isHighlighted = filledFields.includes(field.label);
    
    return (
      <View style={styles.measurementInput}>
        <Text style={styles.inputLabel}>{field.label}</Text>
        <TextInput
          style={[styles.input, isHighlighted && styles.inputHighlighted]}
          placeholder="0"
          placeholderTextColor={COLORS.gray}
          value={value}
          onChangeText={onChange}
          keyboardType="numeric"
        />
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

          {/* Single Voice Entry Button */}
          <GlassCard style={styles.voiceEntryCard}>
            <Text style={styles.voiceTitle}>Voice Entry</Text>
            <Text style={styles.voiceInstructions}>
              Tap the button and say measurements like:{'\n'}
              "Full length 42, shoulder 14, bust 36"
            </Text>
            
            <TouchableOpacity
              style={styles.mainVoiceButton}
              onPress={isRecording ? stopRecording : startRecording}
              activeOpacity={0.8}
            >
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <LinearGradient
                  colors={isRecording ? ['#EF4444', '#DC2626'] : [COLORS.primary, '#991B1B']}
                  style={styles.voiceButtonGradient}
                >
                  <MaterialCommunityIcons
                    name={isRecording ? "stop" : "microphone"}
                    size={40}
                    color={COLORS.white}
                  />
                </LinearGradient>
              </Animated.View>
            </TouchableOpacity>
            
            <Text style={styles.voiceStatus}>
              {isRecording ? 'Listening... Tap to stop' : 'Tap to start voice entry'}
            </Text>

            {transcribedText ? (
              <View style={styles.transcribedBox}>
                <Text style={styles.transcribedLabel}>Heard:</Text>
                <Text style={styles.transcribedText}>"{transcribedText}"</Text>
              </View>
            ) : null}
          </GlassCard>

          {/* Measurements Grid */}
          <GlassCard style={styles.measurementsCard}>
            <Text style={styles.sectionTitle}>{category} Measurements (inches)</Text>
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
    alignItems: 'center',
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.primary + '30',
  },
  voiceTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: SPACING.xs,
  },
  voiceInstructions: {
    fontSize: 13,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  mainVoiceButton: {
    marginBottom: SPACING.md,
  },
  voiceButtonGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.large,
  },
  voiceStatus: {
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: '500',
  },
  transcribedBox: {
    backgroundColor: COLORS.cream,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
    width: '100%',
  },
  transcribedLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 4,
  },
  transcribedText: {
    fontSize: 14,
    color: COLORS.black,
    fontStyle: 'italic',
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
  inputLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: 4,
  },
  input: {
    backgroundColor: COLORS.cream,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    textAlign: 'center',
  },
  inputHighlighted: {
    borderColor: COLORS.success,
    borderWidth: 2,
    backgroundColor: COLORS.success + '10',
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
