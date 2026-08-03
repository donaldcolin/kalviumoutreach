import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Image, View, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp, withRepeat, withTiming, useSharedValue, useAnimatedStyle, withSequence, Easing } from 'react-native-reanimated';

// Gluestack UI Components
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { Input, InputField, InputSlot } from '@/components/ui/input';
import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { loginWithEmail, isLoading, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    clearError();
    await loginWithEmail(email.trim(), password);
  };

  // Background Animations
  const orb1TranslateY = useSharedValue(0);
  const orb2TranslateY = useSharedValue(0);

  React.useEffect(() => {
    orb1TranslateY.value = withRepeat(
      withSequence(
        withTiming(-30, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 4000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    orb2TranslateY.value = withRepeat(
      withSequence(
        withTiming(30, { duration: 5000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 5000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const orb1Style = useAnimatedStyle(() => ({ transform: [{ translateY: orb1TranslateY.value }] }));
  const orb2Style = useAnimatedStyle(() => ({ transform: [{ translateY: orb2TranslateY.value }] }));

  return (
    <View style={styles.container}>
      {/* Dynamic Background */}
      <View style={StyleSheet.absoluteFill} className="bg-slate-50" />
      <Animated.View style={[styles.orb1, orb1Style]} />
      <Animated.View style={[styles.orb2, orb2Style]} />

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" bounces={false}>
            
            <View style={styles.contentWrapper}>
              {/* Header Section */}
              <Animated.View entering={FadeInUp.delay(200).duration(1000).springify()} style={styles.header}>
                <Image
                  source={require('../../../assets/LOGO.png')}
                  style={styles.logo}
                />
                <Text className="text-4xl font-extrabold text-slate-800 mt-6 text-center tracking-tight">
                  Welcome Back!
                </Text>
                <Text className="text-base text-slate-500 text-center mt-2 font-medium">
                  Sign in to continue to Outreach
                </Text>
              </Animated.View>

              {/* Login Form (Minimal) */}
              <Animated.View entering={FadeInDown.delay(400).duration(1000).springify()} style={styles.formWrapper}>
                <VStack space="xl">
                  <Input className="bg-transparent rounded-full border border-slate-300 h-14 transition-colors">
                    <InputField
                      placeholder="Enter your email"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      className="px-6 text-base font-medium text-slate-900"
                      placeholderTextColor="#94A3B8"
                    />
                  </Input>

                  <Input className="bg-transparent rounded-full border border-slate-300 h-14 transition-colors">
                    <InputField
                      placeholder="Enter your password"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoComplete="password"
                      autoCapitalize="none"
                      className="px-6 text-base font-medium text-slate-900"
                      placeholderTextColor="#94A3B8"
                    />
                    <InputSlot className="pr-5" onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color="#94A3B8"
                      />
                    </InputSlot>
                  </Input>

                  {error && (
                    <Animated.View entering={FadeInDown.duration(400)}>
                      <Box className="bg-red-50 border border-red-100 p-4 rounded-3xl flex-row items-center mt-2">
                        <Ionicons name="alert-circle" size={20} color="#DC2626" style={{ marginRight: 8 }} />
                        <Text className="text-red-600 text-sm font-semibold flex-1">{error}</Text>
                      </Box>
                    </Animated.View>
                  )}

                  <Button 
                    size="lg" 
                    variant="default" 
                    className="rounded-full h-14 bg-[#E11D48] hover:bg-[#BE123C] active:bg-[#9F1239] overflow-hidden mt-6" 
                    onPress={handleLogin} 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                        <ButtonSpinner color="white" />
                    ) : (
                      <ButtonText className="font-bold text-lg text-white tracking-wide">Sign In</ButtonText>
                    )}
                  </Button>
                </VStack>
              </Animated.View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    zIndex: 10,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 220,
    height: 80,
    resizeMode: 'contain',
  },
  formWrapper: {
    width: '100%',
  },
  orb1: {
    position: 'absolute',
    top: -height * 0.1,
    right: -width * 0.2,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: 'rgba(225, 29, 72, 0.15)',
    filter: 'blur(60px)',
  },
  orb2: {
    position: 'absolute',
    bottom: -height * 0.1,
    left: -width * 0.2,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    filter: 'blur(60px)',
  },
});
