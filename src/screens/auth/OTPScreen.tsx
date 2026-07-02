import React, { useState, useEffect } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../types';

import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Input, InputField } from '@/components/ui/input';
import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button';

type Props = NativeStackScreenProps<AuthStackParamList, 'OTP'>;

export default function OTPScreen({ route }: Props) {
  const { phoneNumber } = route.params;
  const [code, setCode] = useState('');
  const [timer, setTimer] = useState(30);
  const { verifyOTP, isLoading, error, clearError } = useAuthStore();

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleVerify = async () => {
    if (code.length < 6) return;
    clearError();
    await verifyOTP(code);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'android' ? undefined : 'padding'}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">
        <VStack space="4xl" className="items-center">
          <VStack space="md" className="items-center w-full">
            <Heading size="2xl" className="text-foreground font-bold">Verify OTP</Heading>
            <Text className="text-muted-foreground text-center text-base">
              Enter the 6-digit code sent to{'\n'}
              <Text className="text-primary font-semibold">{phoneNumber}</Text>
            </Text>
          </VStack>

          <Box className="w-full max-w-sm">
            <VStack space="xl" className="items-center">
              <Input
                className="w-4/5 h-20 bg-card rounded-2xl border-2 border-border/50 focus:border-primary"
              >
                <InputField
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="000000"
                  autoFocus
                  className="text-foreground text-4xl font-bold text-center tracking-[0.5em]"
                />
              </Input>

              {error && (
                <Box className="w-full bg-destructive/10 border border-destructive/20 p-3 rounded-xl">
                  <Text className="text-destructive text-sm text-center">{error}</Text>
                </Box>
              )}

              <Button
                size="lg"
                variant="default"
                className={`w-full rounded-xl mt-4 ${(isLoading || code.length < 6) ? 'opacity-50' : ''}`}
                onPress={handleVerify}
                disabled={isLoading || code.length < 6}
              >
                {isLoading ? <ButtonSpinner /> : <ButtonText className="font-bold text-lg">Verify</ButtonText>}
              </Button>

              <Button
                size="lg"
                variant="link"
                className="mt-2"
                onPress={() => setTimer(30)}
                disabled={timer > 0}
              >
                <ButtonText className={`font-semibold ${timer > 0 ? 'text-muted-foreground' : 'text-primary'}`}>
                  {timer > 0 ? `Resend in ${timer}s` : 'Resend Code'}
                </ButtonText>
              </Button>
            </VStack>
          </Box>
        </VStack>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
