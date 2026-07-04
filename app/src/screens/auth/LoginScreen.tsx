import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Alert, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../types';
import { Ionicons } from '@expo/vector-icons';

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
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled" bounces={false}>
          <VStack space="4xl" className="items-center">
            <VStack space="md" className="items-center">
              <Image
                source={require('../../../assets/LOGO.png')}
                style={{ width: 250, height: 150, resizeMode: 'contain' }}
              />
            </VStack>

            <Card className="w-full max-w-sm p-6 bg-card border border-border/50 rounded-2xl">
              <VStack space="xl">
                <VStack space="lg">
                  <Input className="bg-background rounded-xl border-border/50 h-12">
                    <InputField
                      placeholder="Email address"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                    />
                  </Input>
                  <Input className="bg-background rounded-xl border-border/50 h-12">
                    <InputField
                      placeholder="Password"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoComplete="password"
                      autoCapitalize="none"
                    />
                    <InputSlot className="pr-4" onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color="#888"
                      />
                    </InputSlot>
                  </Input>
                </VStack>

                {error && (
                  <Box className="bg-destructive/10 border border-destructive/20 p-3 rounded-xl">
                    <Text className="text-destructive text-sm text-center">{error}</Text>
                  </Box>
                )}

                <VStack space="md" className="mt-2">
                  <Button size="lg" variant="default" className="rounded-xl shadow-sm" onPress={handleLogin} disabled={isLoading}>
                    {isLoading ? <ButtonSpinner /> : <ButtonText className="font-bold">Sign In</ButtonText>}
                  </Button>
                </VStack>
              </VStack>
            </Card>
          </VStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
