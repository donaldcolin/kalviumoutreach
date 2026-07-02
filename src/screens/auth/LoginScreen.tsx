import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../types';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Gluestack UI Components
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Input, InputField } from '@/components/ui/input';
import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { loginWithEmail, isLoading, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    clearError();
    await loginWithEmail(email.trim(), password);
  };

  const handleCreateTestUser = async () => {
    try {
      const testEmail = 'test@kalvium.com';
      const testPassword = 'password123';
      const cred = await auth().createUserWithEmailAndPassword(testEmail, testPassword);
      await firestore().collection('users').doc(cred.user.uid).set({
        id: cred.user.uid,
        name: 'Test Executive',
        email: testEmail,
        phone: '+919999999999',
        role: 'executive',
        status: 'idle',
        location: null
      });
      Alert.alert('Success', 'Test user created! You can now log in with test@kalvium.com / password123');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        Alert.alert('Info', 'Test user already exists. Log in with test@kalvium.com / password123');
      } else {
        Alert.alert('Error', err.message);
      }
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'android' ? undefined : 'padding'}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">
        <VStack space="4xl" className="items-center">
          <VStack space="xs" className="items-center">
            <Heading size="3xl" className="text-primary font-extrabold tracking-tighter">Kalvium</Heading>
            <Heading size="xl" className="text-foreground font-light -mt-2">Outreach</Heading>
            <Text className="text-muted-foreground text-sm mt-2">School Visit Management</Text>
          </VStack>

          <Card className="w-full max-w-sm p-6 bg-card border border-border/50 rounded-2xl">
            <VStack space="xl">
              <VStack space="md">
                <Input className="bg-background rounded-xl border-border/50">
                  <InputField
                    placeholder="Email address"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                </Input>
                <Input className="bg-background rounded-xl border-border/50">
                  <InputField
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoComplete="password"
                  />
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

                {__DEV__ && (
                  <Button size="lg" variant="outline" className="rounded-xl border-border" onPress={handleCreateTestUser}>
                    <ButtonText className="text-foreground">Create Test Account (Dev)</ButtonText>
                  </Button>
                )}
              </VStack>
            </VStack>
          </Card>
        </VStack>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
