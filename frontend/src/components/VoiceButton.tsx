import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, Animated, View, Text, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { COLORS, SHADOWS, BORDER_RADIUS } from '../constants/theme';
import { api } from '../services/api';
import * as FileSystem from 'expo-file-system';

interface VoiceButtonProps {
  onTranscription: (text: string) => void;
  size?: number;
}

export function VoiceButton({ onTranscription, size = 60 }: VoiceButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [scaleAnim] = useState(new Animated.Value(1));

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
    if (!recording) return;

    try {
      scaleAnim.stopAnimation();
      scaleAnim.setValue(1);
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
            onTranscription(result.text);
          } else {
            Alert.alert('Transcription Failed', 'Could not transcribe audio. Please try again.');
          }
        } catch (error) {
          console.error('Transcription error:', error);
          Alert.alert('Error', 'Failed to transcribe audio');
        }
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  const handlePress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
      <Animated.View
        style={[
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ scale: scaleAnim }],
            backgroundColor: isRecording ? COLORS.primary : COLORS.gold,
          },
        ]}
      >
        <Ionicons
          name={isRecording ? 'stop' : 'mic'}
          size={size * 0.4}
          color={COLORS.white}
        />
      </Animated.View>
      {isRecording && (
        <View style={styles.recordingIndicator}>
          <Text style={styles.recordingText}>Recording...</Text>
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
