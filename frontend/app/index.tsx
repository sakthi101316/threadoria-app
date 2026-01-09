import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../src/constants/theme';
import { GoldButton } from '../src/components/GoldButton';
import { useAuth } from '../src/context/AuthContext';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_fashion-tracker-10/artifacts/jedgi7jd_WhatsApp%20Image%202025-11-28%20at%207.10.00%20PM.jpeg';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const fadeAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    // Show splash for 2 seconds
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => setShowSplash(false));
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated && !showSplash) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, showSplash]);

  const handleLogin = async () => {
    if (!username.trim() || !pin.trim()) {
      Alert.alert('Error', 'Please enter username and PIN');
      return;
    }

    setLoginLoading(true);
    try {
      const result = await login(username.trim(), pin.trim());
      if (result.success) {
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

  if (isLoading || showSplash) {
    return (
      <Animated.View style={[styles.splashContainer, { opacity: fadeAnim }]}>
        <LinearGradient
          colors={[COLORS.cream, '#FFF5E6', COLORS.cream]}
          style={StyleSheet.absoluteFill}
        />
        <Image source={{ uri: LOGO_URL }} style={styles.splashLogo} resizeMode="contain" />
        <Text style={styles.tagline}>"Where Elegance Meets Perfection"</Text>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 30 }} />
      </Animated.View>
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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Circular Logo Section */}
          <View style={styles.logoSection}>
            <LinearGradient
              colors={['#FFFFFF', '#FFF5E6', '#FFE4C9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoGradientBg}
            >
              <View style={styles.logoInnerCircle}>
                <Image source={{ uri: LOGO_URL }} style={styles.logo} resizeMode="contain" />
              </View>
            </LinearGradient>
            {/* Decorative rings */}
            <View style={[styles.decorativeRing, styles.ring1]} />
            <View style={[styles.decorativeRing, styles.ring2]} />
          </View>
          
          <Text style={styles.taglineLogin}>"Where Elegance Meets Perfection"</Text>

          <View style={styles.formCard}>
            <Text style={styles.welcomeText}>Welcome Back</Text>
            <Text style={styles.subtitleText}>Sign in to continue</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Username</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter username"
                placeholderTextColor={COLORS.gray}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>PIN</Text>
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

            <GoldButton
              title="Login"
              onPress={handleLogin}
              loading={loginLoading}
              style={styles.loginButton}
            />
          </View>

          <Text style={styles.footerText}>Maahis Designer Boutique</Text>
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
  splashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: 300,
    height: 200,
  },
  tagline: {
    fontSize: 18,
    fontStyle: 'italic',
    color: COLORS.primary,
    marginTop: 20,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logo: {
    width: 250,
    height: 150,
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
  input: {
    backgroundColor: COLORS.cream,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  loginButton: {
    marginTop: SPACING.lg,
  },
  footerText: {
    textAlign: 'center',
    color: COLORS.gray,
    fontSize: 14,
    marginTop: SPACING.xl,
  },
});
