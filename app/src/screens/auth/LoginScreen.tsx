import React, { useState, useEffect } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { Mail, Lock } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

// Gluestack UI Components
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { Input, InputField, InputSlot } from '@/components/ui/input';
import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { loginWithEmail, isLoading, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    clearError();
    await loginWithEmail(email.trim(), password);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, zIndex: 10 }} keyboardShouldPersistTaps="handled" bounces={false}>
          <VStack space="4xl" className="items-center w-full">
            <Animated.View entering={FadeInUp.delay(200).duration(1000).springify()} style={{ alignItems: 'center' }}>
              <Image
                source={require('../../../assets/LOGO.png')}
                style={{ width: 220, height: 100, resizeMode: 'contain', marginBottom: 8 }}
              />
              <Text className="text-4xl font-extrabold text-foreground mt-2 text-center tracking-tight">Welcome</Text>
              <Text className="text-lg text-muted-foreground text-center mt-2 font-medium">Log in to your account</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(400).duration(1000).springify()} style={{ width: '100%', maxWidth: 400 }}>
              <Card className="w-full p-8 bg-white/90 border border-white rounded-[32px] shadow-lg overflow-hidden">
                <VStack space="2xl">
                  <VStack space="xl">
                    <Box>
                      <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 ml-1">Email Address</Text>
                      <Input className="bg-background rounded-2xl border-transparent focus:border-primary/50 h-14 transition-colors">
                        <InputSlot className="pl-4">
                          <Mail size={20} color="#888" strokeWidth={2.5} />
                        </InputSlot>
                        <InputField
                          placeholder="Eg. admin@kalvium.com"
                          value={email}
                          onChangeText={setEmail}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoComplete="email"
                          className="px-4 text-base font-medium text-foreground"
                          placeholderTextColor="#A0A0A0"
                        />
                      </Input>
                    </Box>

                    <Box>
                      <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 ml-1">Password</Text>
                      <Input className="bg-background rounded-2xl border-transparent focus:border-primary/50 h-14 transition-colors">
                        <InputSlot className="pl-4">
                          <Lock size={20} color="#888" strokeWidth={2.5} />
                        </InputSlot>
                        <InputField
                          placeholder="Enter your password"
                          value={password}
                          onChangeText={setPassword}
                          secureTextEntry={!showPassword}
                          autoComplete="password"
                          autoCapitalize="none"
                          className="px-4 text-base font-medium text-foreground"
                          placeholderTextColor="#A0A0A0"
                        />
                        <InputSlot className="pr-4" onPress={() => setShowPassword(!showPassword)}>
                          <Ionicons
                            name={showPassword ? "eye-off-outline" : "eye-outline"}
                            size={22}
                            color="#888"
                          />
                        </InputSlot>
                      </Input>
                    </Box>
                  </VStack>

                  {error && (
                    <Animated.View entering={FadeInDown.duration(400)}>
                      <Box className="bg-destructive/10 border border-destructive/20 p-4 rounded-2xl mt-2 flex-row items-center">
                        <Ionicons name="alert-circle" size={20} color="#ef4444" style={{ marginRight: 8 }} />
                        <Text className="text-destructive text-sm font-semibold flex-1">{error}</Text>
                      </Box>
                    </Animated.View>
                  )}

                  <VStack space="md" className="mt-6">
                    <Button 
                      size="lg" 
                      variant="default" 
                      className="rounded-2xl h-14 shadow-md bg-primary hover:bg-primary/90 active:bg-primary/80 overflow-hidden" 
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
                </VStack>
              </Card>
            </Animated.View>
          </VStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
