import React, { useState, useRef } from 'react';
import { TouchableOpacity, StyleSheet, Animated, View, Text, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { COLORS, SHADOWS } from '../constants/theme';
import { api } from '../services/api';

interface VoiceButtonProps {
  onTranscription: (text: string) => void;
  size?: number;
}

export function VoiceButton({ onTranscription, size = 60 }: VoiceButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

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
      
      recordingRef.current = recording;
      setIsRecording(true);

      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    try {
      scaleAnim.stopAnimation();
      scaleAnim.setValue(1);
      setIsRecording(false);
      setIsProcessing(true);

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (uri) {
        // Read audio file using fetch
        const response = await fetch(uri);
        const blob = await response.blob();
        
        const base64Audio = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1] || result;
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        // Send to backend for transcription
        try {
          const result = await api.transcribeVoice(base64Audio, 'm4a');
          if (result.success && result.text) {
            onTranscription(result.text);
          } else {
            Alert.alert('Voice Input', 'Could not understand. Please try again.');
          }
        } catch (error) {
          console.error('Transcription error:', error);
          Alert.alert('Error', 'Failed to process voice');
        }
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePress = () => {
    if (isProcessing) return;
    
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8} disabled={isProcessing}>
      <Animated.View
        style={[
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ scale: scaleAnim }],
            backgroundColor: isRecording ? COLORS.primary : isProcessing ? COLORS.gray : COLORS.gold,
          },
        ]}
      >
        <Ionicons
          name={isRecording ? 'stop' : isProcessing ? 'hourglass' : 'mic'}
          size={size * 0.4}
          color={COLORS.white}
        />
      </Animated.View>
      {(isRecording || isProcessing) && (
        <View style={styles.recordingIndicator}>
          <Text style={styles.recordingText}>
            {isRecording ? 'Recording...' : 'Processing...'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.gold,
  },
  recordingIndicator: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    right: -20,
    alignItems: 'center',
  },
  recordingText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
});
