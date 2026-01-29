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
  'sleeve around': 'sleeve_round',
  'arm hole': 'arm_hole',
  'armhole': 'arm_hole',
  'biceps': 'biceps',
  'bicep': 'biceps',
  'front deep': 'front_deep',
  'front': 'front_deep',
  'back deep': 'back_deep',
  'back': 'back_deep',
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
  const [isListening, setIsListening] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [lastFilledField, setLastFilledField] = useState('');
  const [statusText, setStatusText] = useState('Tap to START');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Refs for continuous recording
  const recordingRef = useRef<Audio.Recording | null>(null);
  const isListeningRef = useRef(false);
  const chunkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Top measurements
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  // Pulse animation when listening
  useEffect(() => {
    if (isListening) {
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
  }, [isListening]);

  // Parse voice input to extract field-value pairs
  const parseAndFillMeasurements = (text: string) => {
    if (!text) return false;
    
    const lowerText = text.toLowerCase();
    let filled = false;
    
    // Sort by length to match longer phrases first
    const sortedMappings = Object.entries(FIELD_MAPPINGS).sort(
      (a, b) => b[0].length - a[0].length
    );
    
    for (const [spoken, fieldKey] of sortedMappings) {
      const regex = new RegExp(`${spoken}\\s*(?:is|equals|=|:)?\\s*([0-9]+\\.?[0-9]*)`, 'gi');
      const matches = [...lowerText.matchAll(regex)];
      
      for (const match of matches) {
        if (match[1]) {
          const value = match[1];
          
          if (category === 'Top' && fieldKey in topMeasurements) {
            setTopMeasurements(prev => ({ ...prev, [fieldKey]: value }));
            setLastFilledField(fieldKey);
            filled = true;
          } else if (category === 'Bottom' && fieldKey in bottomMeasurements) {
            setBottomMeasurements(prev => ({ ...prev, [fieldKey]: value }));
            setLastFilledField(fieldKey);
            filled = true;
          }
        }
      }
    }
    
    if (filled) {
      setTimeout(() => setLastFilledField(''), 1500);
    }
    
    return filled;
  };

  // Process audio chunk - only if there's actual speech
  const processAudioChunk = async (uri: string) => {
    try {
      setStatusText('Processing...');
      
      // Use fetch to read the file as blob, then convert to base64
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Skip processing if audio is too short (likely silence)
      if (blob.size < 5000) {
        setStatusText('Listening...');
        return;
      }
      
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove the data URL prefix to get just base64
          const base64 = result.split(',')[1] || result;
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      
      // Only process if we have substantial audio data
      if (base64Audio && base64Audio.length > 2000) {
        const result = await api.transcribeVoice(base64Audio, 'm4a');
        
        if (result.success && result.text && result.text.trim() && result.text.trim().length > 2) {
          const newText = result.text.trim();
          // Ignore common noise/silence transcriptions
          if (!['', '.', '..', '...', 'you', 'the', 'a', 'hmm', 'uh', 'um'].includes(newText.toLowerCase())) {
            setTranscribedText(prev => {
              const combined = prev ? `${prev} ${newText}` : newText;
              return combined.slice(-150);
            });
            const filled = parseAndFillMeasurements(newText);
            if (filled) {
              setStatusText('✓ Field filled!');
            } else {
              setStatusText('Listening...');
            }
          } else {
            setStatusText('Listening...');
          }
        } else {
          setStatusText('Listening...');
        }
      } else {
        setStatusText('Listening...');
      }
    } catch (error) {
      console.error('Process chunk error:', error);
      setStatusText('Listening...');
    }
  };

  // Start a new recording chunk
  const startNewChunk = async () => {
    try {
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
    } catch (error) {
      console.error('Start chunk error:', error);
    }
  };

  // Stop current chunk and process it
  const stopAndProcessChunk = async () => {
    if (!recordingRef.current) return;
    
    try {
      const recording = recordingRef.current;
      recordingRef.current = null;
      
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      if (uri) {
        // Process in background
        processAudioChunk(uri);
      }
    } catch (error) {
      console.error('Stop chunk error:', error);
    }
  };

  // Main continuous recording loop
  const startListening = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please grant microphone permission.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      isListeningRef.current = true;
      setIsListening(true);
      setTranscribedText('');
      setStatusText('Listening...');

      // Start first chunk
      await startNewChunk();

      // Set up interval to process chunks every 3 seconds
      chunkIntervalRef.current = setInterval(async () => {
        if (!isListeningRef.current) return;
        
        // Stop current chunk and process it
        await stopAndProcessChunk();
        
        // Start new chunk immediately
        if (isListeningRef.current) {
          await startNewChunk();
        }
      }, 3000);

    } catch (error) {
      console.error('Start listening error:', error);
      Alert.alert('Error', 'Failed to start voice input.');
      stopListening();
    }
  };

  const stopListening = async () => {
    isListeningRef.current = false;
    setIsListening(false);
    setStatusText('Tap to START');

    // Clear interval
    if (chunkIntervalRef.current) {
      clearInterval(chunkIntervalRef.current);
      chunkIntervalRef.current = null;
    }

    // Stop and process final chunk
    await stopAndProcessChunk();
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
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

    // Stop listening if active
    if (isListening) {
      await stopListening();
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
    const isHighlighted = lastFilledField === field.key;
    
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={COLORS.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Measurement</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
        >
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

          {/* Voice Entry Card */}
          <GlassCard style={[styles.voiceCard, isListening && styles.voiceCardActive]}>
            <Text style={styles.voiceTitle}>
              {isListening ? '🔴 LIVE Recording' : '🎙️ Voice Entry'}
            </Text>
            <Text style={styles.voiceInstructions}>
              Say: "Full length 42, shoulder 14, bust 36"
            </Text>
            <Text style={styles.voiceNote}>
              Fields fill every 3 seconds as you speak
            </Text>
            
            <TouchableOpacity
              style={styles.mainVoiceButton}
              onPress={toggleListening}
              activeOpacity={0.8}
            >
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <LinearGradient
                  colors={isListening ? ['#EF4444', '#DC2626'] : [COLORS.primary, '#991B1B']}
                  style={styles.voiceButtonGradient}
                >
                  <MaterialCommunityIcons
                    name={isListening ? "stop" : "microphone"}
                    size={48}
                    color={COLORS.white}
                  />
                </LinearGradient>
              </Animated.View>
            </TouchableOpacity>
            
            <Text style={[styles.voiceStatus, isListening && styles.voiceStatusActive]}>
              {statusText}
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
  voiceCard: {
    alignItems: 'center',
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.lightGray,
  },
  voiceCardActive: {
    borderColor: COLORS.error,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  voiceTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: SPACING.xs,
  },
  voiceInstructions: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
  },
  voiceNote: {
    fontSize: 12,
    color: COLORS.success,
    textAlign: 'center',
    marginBottom: SPACING.md,
    fontWeight: '600',
  },
  mainVoiceButton: {
    marginBottom: SPACING.md,
  },
  voiceButtonGradient: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.large,
  },
  voiceStatus: {
    fontSize: 16,
    color: COLORS.gray,
    fontWeight: '600',
  },
  voiceStatusActive: {
    color: COLORS.error,
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
    backgroundColor: COLORS.success + '20',
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
