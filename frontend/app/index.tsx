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
  Image,
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
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pinRef = useRef<TextInput>(null);

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

  // REMOVED: Auto-redirect logic that was causing infinite loop
  // The tabs layout now handles all auth-based redirects
  // Login page should only navigate to tabs AFTER successful login action

  const playWelcomeAudio = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://www.soundjay.com/misc/sounds/magic-chime-02.mp3' },
        { shouldPlay: true }
      );
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
    if (!phone.trim() || !pin.trim()) {
      Alert.alert('Error', 'Please enter mobile number and PIN');
      return;
    }

    if (phone.length < 10) {
      Alert.alert('Error', 'Please enter valid 10-digit mobile number');
      return;
    }

    setLoginLoading(true);
    try {
      const result = await login(phone.trim(), pin.trim());
      if (result.success) {
        // Navigate to tabs after successful login
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
              <Image 
                source={require('../assets/maahis-logo.png')} 
                style={styles.splashLogo}
                resizeMode="contain"
              />
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
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
          >
            {/* Logo Section */}
            <View style={styles.logoSection}>
              <View style={styles.logoContainer}>
                <Image 
                  source={require('../assets/maahis-logo.png')} 
                  style={styles.mainLogo}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.appName}>{APP_CONFIG.name}</Text>
              <Text style={styles.tagline}>{APP_CONFIG.tagline}</Text>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.welcomeText}>Welcome Back</Text>
              <Text style={styles.subtitleText}>Sign in to your boutique</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Mobile Number</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.countryCode}>+91</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter 10-digit mobile"
                    placeholderTextColor={COLORS.gray}
                    value={phone}
                    onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, '').slice(0, 10))}
                    keyboardType="phone-pad"
                    maxLength={10}
                    returnKeyType="next"
                    onSubmitEditing={() => pinRef.current?.focus()}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>PIN</Text>
                <View style={styles.inputWrapper}>
                  <Feather name="lock" size={20} color={COLORS.gray} style={styles.inputIcon} />
                  <TextInput
                    ref={pinRef}
                    style={styles.input}
                    placeholder="Enter 6-digit PIN"
                    placeholderTextColor={COLORS.gray}
                    value={pin}
                    onChangeText={setPin}
                    keyboardType="numeric"
                    secureTextEntry
                    maxLength={6}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
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
                <Text style={styles.registerText}>New to MAAHIS?</Text>
                <TouchableOpacity onPress={() => router.push('/register')}>
                  <Text style={styles.registerLink}>Create Account</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer with Shivom Creatives */}
            <View style={styles.footerContainer}>
              <Text style={styles.poweredByText}>Powered by</Text>
              <Image
                source={{ uri: 'https://customer-assets.emergentagent.com/job_boutique-manager-17/artifacts/e5ms1oga_Shivam%20%281%29.png' }}
                style={styles.shivomLogo}
                resizeMode="contain"
              />
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
    borderWidth: 3,
    borderColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMiddleRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: COLORS.primary + '60',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 115,
    height: 115,
    borderRadius: 58,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.gold,
    borderWidth: 2,
    borderColor: COLORS.gold + '40',
  },
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...SHADOWS.large,
  },
  mainLogo: {
    width: 120,
    height: 120,
  },
  splashLogo: {
    width: 100,
    height: 100,
  },
  appName: {
    fontSize: 38,
    fontWeight: 'bold',
    color: COLORS.black,
    marginTop: SPACING.md,
    letterSpacing: 3,
    textShadowColor: COLORS.gold + '40',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  tagline: {
    fontSize: 15,
    fontStyle: 'italic',
    color: COLORS.gold,
    marginTop: SPACING.xs,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
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
  countryCode: {
    paddingLeft: SPACING.md,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
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
  poweredByText: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: SPACING.sm,
  },
  shivomLogo: {
    width: 120,
    height: 60,
    marginBottom: SPACING.xs,
  },
  versionText: {
    fontSize: 11,
    color: COLORS.lightGray,
    marginTop: SPACING.xs,
  },
});
