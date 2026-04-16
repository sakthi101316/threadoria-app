import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, APP_CONFIG } from '../src/constants/theme';
import { GoldButton } from '../src/components/GoldButton';
import { AnimatedBackground } from '../src/components/AnimatedBackground';
import { api } from '../src/services/api';

export default function RegisterScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Form fields
  const [boutiqueName, setBoutiqueName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [otp, setOtp] = useState('');

  // Refs for focusing next input
  const ownerNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const pinRef = useRef<TextInput>(null);
  const confirmPinRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSendOTP = async () => {
    if (!boutiqueName.trim()) {
      Alert.alert('Error', 'Please enter your boutique name');
      return;
    }
    if (!ownerName.trim()) {
      Alert.alert('Error', 'Please enter owner name');
      return;
    }
    if (!email.trim() || !validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    if (!phone.trim() || phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number (10 digits)');
      return;
    }
    if (pin.length !== 6) {
      Alert.alert('Error', 'PIN must be 6 digits');
      return;
    }
    if (pin !== confirmPin) {
      Alert.alert('Error', 'PINs do not match');
      return;
    }

    setLoading(true);
    try {
      const result = await api.sendOTP(phone);
      if (result.success) {
        Alert.alert('OTP Sent', result.message);
        setStep(2);
      } else {
        Alert.alert('Error', result.message || 'Failed to send OTP');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      Alert.alert('Error', 'Please enter 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const result = await api.register({
        boutique_name: boutiqueName.trim(),
        owner_name: ownerName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        pin: pin,
        otp: otp,
      });
      
      if (result.success) {
        Alert.alert(
          'Registration Successful!', 
          'Welcome to MAAHIS! Please login with your phone number and PIN.',
          [{ text: 'Login Now', onPress: () => router.replace('/') }]
        );
      } else {
        Alert.alert('Error', result.message || 'Registration failed');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AnimatedBackground>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
          >
            {/* Back Button */}
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Feather name="arrow-left" size={24} color={COLORS.black} />
            </TouchableOpacity>

            {/* Logo Section */}
            <View style={styles.logoSection}>
              <View style={styles.logoCircle}>
                <MaterialCommunityIcons name="scissors-cutting" size={50} color={COLORS.primary} />
              </View>
              <Text style={styles.appName}>{APP_CONFIG.name}</Text>
              <Text style={styles.tagline}>{APP_CONFIG.tagline}</Text>
            </View>

            <View style={styles.formCard}>
              {step === 1 ? (
                <>
                  <Text style={styles.title}>Create Account</Text>
                  <Text style={styles.subtitle}>Join thousands of boutiques</Text>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Boutique Name</Text>
                    <View style={styles.inputWrapper}>
                      <Feather name="shopping-bag" size={20} color={COLORS.gray} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your boutique name"
                        placeholderTextColor={COLORS.gray}
                        value={boutiqueName}
                        onChangeText={setBoutiqueName}
                        returnKeyType="next"
                        onSubmitEditing={() => ownerNameRef.current?.focus()}
                      />
                    </View>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Owner Name</Text>
                    <View style={styles.inputWrapper}>
                      <Feather name="user" size={20} color={COLORS.gray} style={styles.inputIcon} />
                      <TextInput
                        ref={ownerNameRef}
                        style={styles.input}
                        placeholder="Enter owner name"
                        placeholderTextColor={COLORS.gray}
                        value={ownerName}
                        onChangeText={setOwnerName}
                        returnKeyType="next"
                        onSubmitEditing={() => emailRef.current?.focus()}
                      />
                    </View>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Email (for cloud backup)</Text>
                    <View style={styles.inputWrapper}>
                      <Feather name="mail" size={20} color={COLORS.gray} style={styles.inputIcon} />
                      <TextInput
                        ref={emailRef}
                        style={styles.input}
                        placeholder="Enter email address"
                        placeholderTextColor={COLORS.gray}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        returnKeyType="next"
                        onSubmitEditing={() => phoneRef.current?.focus()}
                      />
                    </View>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Mobile Number (for OTP verification)</Text>
                    <View style={styles.inputWrapper}>
                      <Text style={styles.countryCode}>+91</Text>
                      <TextInput
                        ref={phoneRef}
                        style={styles.input}
                        placeholder="Enter 10-digit mobile number"
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
                    <Text style={styles.inputLabel}>Create PIN (6 digits)</Text>
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
                        returnKeyType="next"
                        onSubmitEditing={() => confirmPinRef.current?.focus()}
                      />
                    </View>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Confirm PIN</Text>
                    <View style={styles.inputWrapper}>
                      <Feather name="lock" size={20} color={COLORS.gray} style={styles.inputIcon} />
                      <TextInput
                        ref={confirmPinRef}
                        style={styles.input}
                        placeholder="Re-enter PIN"
                        placeholderTextColor={COLORS.gray}
                        value={confirmPin}
                        onChangeText={setConfirmPin}
                        keyboardType="numeric"
                        secureTextEntry
                        maxLength={6}
                        returnKeyType="done"
                      />
                    </View>
                  </View>

                  <GoldButton
                    title="Send OTP"
                    onPress={handleSendOTP}
                    loading={loading}
                    style={styles.submitButton}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.title}>Verify Mobile</Text>
                  <Text style={styles.subtitle}>Enter the 6-digit code sent to +91{phone}</Text>

                  <View style={styles.otpContainer}>
                    <TextInput
                      style={styles.otpInput}
                      placeholder="000000"
                      placeholderTextColor={COLORS.lightGray}
                      value={otp}
                      onChangeText={setOtp}
                      keyboardType="numeric"
                      maxLength={6}
                      textAlign="center"
                    />
                  </View>

                  <GoldButton
                    title="Verify & Register"
                    onPress={handleVerifyOTP}
                    loading={loading}
                    style={styles.submitButton}
                  />

                  <TouchableOpacity style={styles.resendButton} onPress={handleSendOTP}>
                    <Text style={styles.resendText}>Didn't receive code? Resend</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.changeEmailButton} onPress={() => setStep(1)}>
                    <Text style={styles.changeEmailText}>← Change details</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <TouchableOpacity onPress={() => router.replace('/')}>
                <Text style={styles.loginLink}>Login here</Text>
              </TouchableOpacity>
            </View>

            {/* Powered by Shivom Creatives */}
            <View style={styles.poweredByContainer}>
              <Text style={styles.poweredByText}>Powered by</Text>
              <Image
                source={{ uri: 'https://customer-assets.emergentagent.com/job_boutique-manager-17/artifacts/e5ms1oga_Shivam%20%281%29.png' }}
                style={styles.poweredByLogo}
                resizeMode="contain"
              />
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
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
    marginBottom: SPACING.md,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.gold,
    marginBottom: SPACING.sm,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.gold,
    fontStyle: 'italic',
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.large,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.black,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: SPACING.lg,
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
  submitButton: {
    marginTop: SPACING.md,
  },
  otpContainer: {
    alignItems: 'center',
    marginVertical: SPACING.xl,
  },
  otpInput: {
    width: 200,
    height: 60,
    backgroundColor: COLORS.cream,
    borderRadius: BORDER_RADIUS.lg,
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 10,
    borderWidth: 2,
    borderColor: COLORS.gold,
  },
  resendButton: {
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  resendText: {
    color: COLORS.primary,
    fontSize: 14,
  },
  changeEmailButton: {
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  changeEmailText: {
    color: COLORS.gray,
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xl,
    gap: SPACING.xs,
  },
  footerText: {
    color: COLORS.gray,
    fontSize: 14,
  },
  loginLink: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  poweredByContainer: {
    alignItems: 'center',
    marginTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  poweredByText: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: SPACING.sm,
  },
  poweredByLogo: {
    width: 120,
    height: 60,
  },
});
