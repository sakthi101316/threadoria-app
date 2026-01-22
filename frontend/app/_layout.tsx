import React from 'react';
import { Slot, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, Image, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { COLORS, SPACING, BORDER_RADIUS } from '../src/constants/theme';

// Simple inline Login Screen to avoid import issues
function InlineLoginScreen() {
  const { login } = useAuth();
  const [phone, setPhone] = React.useState('');
  const [pin, setPin] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleLogin = async () => {
    if (!phone.trim() || !pin.trim()) {
      Alert.alert('Error', 'Please enter phone and PIN');
      return;
    }
    setLoading(true);
    try {
      const result = await login(phone.trim(), pin.trim());
      if (!result.success) {
        Alert.alert('Login Failed', result.message);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[COLORS.cream, '#FFF5E6', COLORS.cream]} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.logoContainer}>
            <Text style={styles.appName}>BoutiqueFit</Text>
            <Text style={styles.tagline}>Where Elegance Meets Perfection</Text>
          </View>
          
          <View style={styles.formContainer}>
            <Text style={styles.welcomeText}>Welcome Back</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Mobile Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter mobile number"
                placeholderTextColor={COLORS.gray}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>PIN</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter PIN"
                placeholderTextColor={COLORS.gray}
                secureTextEntry
                keyboardType="numeric"
                maxLength={6}
                value={pin}
                onChangeText={setPin}
              />
            </View>

            <TouchableOpacity 
              style={[styles.loginButton, loading && styles.loginButtonDisabled]} 
              onPress={handleLogin}
              disabled={loading}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.loginButtonGradient}
              >
                <Text style={styles.loginButtonText}>{loading ? 'Logging in...' : 'Login'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: SPACING.lg },
  logoContainer: { alignItems: 'center', marginBottom: SPACING.xl },
  appName: { fontSize: 32, fontWeight: 'bold', color: COLORS.primary },
  tagline: { fontSize: 14, color: COLORS.gray, marginTop: SPACING.xs },
  formContainer: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg },
  welcomeText: { fontSize: 24, fontWeight: 'bold', color: COLORS.black, marginBottom: SPACING.lg, textAlign: 'center' },
  inputContainer: { marginBottom: SPACING.md },
  inputLabel: { fontSize: 14, fontWeight: '600', color: COLORS.black, marginBottom: SPACING.xs },
  input: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, fontSize: 16 },
  loginButton: { marginTop: SPACING.md, borderRadius: BORDER_RADIUS.md, overflow: 'hidden' },
  loginButtonDisabled: { opacity: 0.7 },
  loginButtonGradient: { padding: SPACING.md, alignItems: 'center' },
  loginButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
});

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.cream }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // NOT AUTHENTICATED - Show inline login
  if (!isAuthenticated) {
    return (
      <>
        <StatusBar style="dark" />
        <InlineLoginScreen />
      </>
    );
  }

  // AUTHENTICATED - Show full app
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.cream } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="customer/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="order/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="add-customer" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add-order" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add-measurement" options={{ presentation: 'modal' }} />
        <Stack.Screen name="edit-measurement" options={{ presentation: 'modal' }} />
        <Stack.Screen name="edit-order" options={{ presentation: 'modal' }} />
        <Stack.Screen name="search" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
