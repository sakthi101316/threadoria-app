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
  TouchableWithoutFeedback,
  Keyboard,
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
      Alert.alert('Error', 'Please enter a valid phone number');
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
      const result = await api.sendOTP(email);
      if (result.success) {
        Alert.alert('OTP Sent', `Verification code sent to ${email}`);
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
          'Welcome to BoutiqueFit! Please login with your email and PIN.',
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

  const InputField = ({ label, icon, inputRef, onSubmit, ...props }: any) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputWrapper}>
        <Feather name={icon} size={20} color={COLORS.gray} style={styles.inputIcon} />
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholderTextColor={COLORS.gray}
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={onSubmit}
          {...props}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <AnimatedBackground>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
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

                    <InputField
                      label="Boutique Name"
                      icon="shopping-bag"
                      placeholder="Enter your boutique name"
                      value={boutiqueName}
                      onChangeText={setBoutiqueName}
                      onSubmit={() => ownerNameRef.current?.focus()}
                    />
                    <InputField
                      label="Owner Name"
                      icon="user"
                      placeholder="Enter owner name"
                      value={ownerName}
                      onChangeText={setOwnerName}
                      inputRef={ownerNameRef}
                      onSubmit={() => emailRef.current?.focus()}
                    />
                    <InputField
                      label="Email"
                      icon="mail"
                      placeholder="Enter email address"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      inputRef={emailRef}
                      onSubmit={() => phoneRef.current?.focus()}
                    />
                    <InputField
                      label="Phone Number"
                      icon="phone"
                      placeholder="Enter phone number"
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      inputRef={phoneRef}
                      onSubmit={() => pinRef.current?.focus()}
                    />
                    <InputField
                      label="Create PIN (6 digits)"
                      icon="lock"
                      placeholder="Enter 6-digit PIN"
                      value={pin}
                      onChangeText={setPin}
                      keyboardType="numeric"
                      secureTextEntry
                      maxLength={6}
                      inputRef={pinRef}
                      onSubmit={() => confirmPinRef.current?.focus()}
                    />
                    <InputField
                      label="Confirm PIN"
                      icon="lock"
                      placeholder="Re-enter PIN"
                      value={confirmPin}
                      onChangeText={setConfirmPin}
                      keyboardType="numeric"
                      secureTextEntry
                      maxLength={6}
                      inputRef={confirmPinRef}
                      returnKeyType="done"
                      onSubmit={Keyboard.dismiss}
                    />

                    <GoldButton
                      title="Send OTP"
                      onPress={handleSendOTP}
                      loading={loading}
                      style={styles.submitButton}
                    />
                  </>
                ) : (
                  <>
                    <Text style={styles.title}>Verify Email</Text>
                    <Text style={styles.subtitle}>Enter the 6-digit code sent to {email}</Text>

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
                      <Text style={styles.changeEmailText}>← Change email</Text>
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
                  source={{ uri: 'https://customer-assets.emergentagent.com/job_boutique-manager-17/artifacts/shivom_creatives_logo.png' }}
                  style={styles.poweredByLogo}
                  resizeMode="contain"
                />
                <Text style={styles.poweredByName}>Shivom Creatives</Text>
              </View>
            </ScrollView>
          </TouchableWithoutFeedback>
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
    marginBottom: SPACING.xs,
  },
  poweredByLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.white,
  },
  poweredByName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: SPACING.xs,
  },
});
