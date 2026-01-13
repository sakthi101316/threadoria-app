import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Animated,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, APP_CONFIG } from '../src/constants/theme';
import { GoldButton } from '../src/components/GoldButton';
import { AnimatedBackground } from '../src/components/AnimatedBackground';
import { useAuth } from '../src/context/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate logo on splash
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Show splash for 2.5 seconds
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => setShowSplash(false));
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated && !showSplash) {
      playWelcomeAudio();
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, showSplash]);

  const playWelcomeAudio = async () => {
    try {
      // Use expo-av to play welcome sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://www.soundjay.com/misc/sounds/magic-chime-02.mp3' },
        { shouldPlay: true }
      );
      // Clean up after playing
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.log('Audio play error:', error);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !pin.trim()) {
      Alert.alert('Error', 'Please enter email and PIN');
      return;
    }

    setLoginLoading(true);
    try {
      const result = await login(email.trim().toLowerCase(), pin.trim());
      if (result.success) {
        await playWelcomeAudio();
        router.replace('/(tabs)');
      } else {
        Alert.alert('Login Failed', result.message);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (isLoading || showSplash) {
    return (
      <Animated.View style={[styles.splashContainer, { opacity: fadeAnim }]}>
        <AnimatedBackground>
          <View style={styles.splashContent}>
            <Animated.View style={[styles.splashLogoCircle, { transform: [{ scale: scaleAnim }] }]}>
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <MaterialCommunityIcons name="scissors-cutting" size={70} color={COLORS.primary} />
              </Animated.View>
            </Animated.View>
            <Text style={styles.splashAppName}>{APP_CONFIG.name}</Text>
            <Text style={styles.splashTagline}>{APP_CONFIG.tagline}</Text>
            <ActivityIndicator size="large" color={COLORS.gold} style={{ marginTop: 40 }} />
          </View>
        </AnimatedBackground>
      </Animated.View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AnimatedBackground>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Logo Section */}
            <View style={styles.logoSection}>
              <View style={styles.logoOuterRing}>
                <View style={styles.logoMiddleRing}>
                  <View style={styles.logoCircle}>
                    <MaterialCommunityIcons name="scissors-cutting" size={55} color={COLORS.primary} />
                  </View>
                </View>
              </View>
              <Text style={styles.appName}>{APP_CONFIG.name}</Text>
              <Text style={styles.tagline}>{APP_CONFIG.tagline}</Text>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.welcomeText}>Welcome Back</Text>
              <Text style={styles.subtitleText}>Sign in to your boutique</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email</Text>
                <View style={styles.inputWrapper}>
                  <Feather name="mail" size={20} color={COLORS.gray} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor={COLORS.gray}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>PIN</Text>
                <View style={styles.inputWrapper}>
                  <Feather name="lock" size={20} color={COLORS.gray} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter 6-digit PIN"
                    placeholderTextColor={COLORS.gray}
                    value={pin}
                    onChangeText={setPin}
                    keyboardType="numeric"
                    secureTextEntry
                    maxLength={6}
                  />
                </View>
              </View>

              <GoldButton
                title="Login"
                onPress={handleLogin}
                loading={loginLoading}
                style={styles.loginButton}
              />

              <View style={styles.registerContainer}>
                <Text style={styles.registerText}>New to BoutiqueFit?</Text>
                <TouchableOpacity onPress={() => router.push('/register')}>
                  <Text style={styles.registerLink}>Create Account</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footerContainer}>
              <Text style={styles.footerText}>Boutique Management Made Simple</Text>
              <Text style={styles.versionText}>v{APP_CONFIG.version}</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </AnimatedBackground>
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
  splashContainer: {
    flex: 1,
  },
  splashContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogoCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.gold,
  },
  splashAppName: {
    fontSize: 42,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: SPACING.lg,
    letterSpacing: 2,
  },
  splashTagline: {
    fontSize: 16,
    fontStyle: 'italic',
    color: COLORS.gold,
    marginTop: SPACING.sm,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoOuterRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: COLORS.gold + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMiddleRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: COLORS.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.gold,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: SPACING.md,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 14,
    fontStyle: 'italic',
    color: COLORS.gold,
    marginTop: SPACING.xs,
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.large,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.black,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  subtitleText: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  inputContainer: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: SPACING.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cream,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  inputIcon: {
    paddingLeft: SPACING.md,
  },
  input: {
    flex: 1,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.black,
  },
  loginButton: {
    marginTop: SPACING.lg,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.lg,
    gap: SPACING.xs,
  },
  registerText: {
    fontSize: 14,
    color: COLORS.gray,
  },
  registerLink: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  footerContainer: {
    alignItems: 'center',
    marginTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  footerText: {
    textAlign: 'center',
    color: COLORS.gray,
    fontSize: 14,
  },
  versionText: {
    fontSize: 12,
    color: COLORS.lightGray,
    marginTop: SPACING.xs,
  },
});
