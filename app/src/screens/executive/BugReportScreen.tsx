import React, { useState } from 'react';
import { View, Text, TextInput, Alert, Linking, ScrollView, Platform } from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button';
import { Bug, Info } from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';
import * as Device from 'expo-device';

export default function BugReportScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Missing Info', 'Please describe the bug before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Gather diagnostic info
      const deviceInfo = `${Device.brand} ${Device.modelName} (${Platform.OS} ${Platform.Version})`;
      const userEmail = user?.email || 'Unknown User';
      
      const emailBody = `
Bug Description:
${description}

---
Diagnostic Info:
User: ${userEmail}
Device: ${deviceInfo}
Date: ${new Date().toLocaleString()}
      `.trim();

      const targetEmail = 'donald.colin@kalvium.com';
      const subject = encodeURIComponent('Kalvium Outreach App - Bug Report');
      const body = encodeURIComponent(emailBody);
      
      const mailtoUrl = `mailto:${targetEmail}?subject=${subject}&body=${body}`;
      
      try {
        await Linking.openURL(mailtoUrl);
        // Clear the form and go back
        setDescription('');
        setTimeout(() => {
          navigation.goBack();
        }, 500);
      } catch (error) {
        Alert.alert('Error', 'No email client configured on this device. Please GChat donald.colin@kalvium.com');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-slate-50" keyboardShouldPersistTaps="handled">
      <VStack className="p-6 space-y-6 flex-1">
        <View className="items-center mb-4 mt-6">
          <Box className="w-20 h-20 rounded-full bg-red-100 items-center justify-center mb-4">
            <Bug color="#DC2626" size={36} strokeWidth={1.5} />
          </Box>
          <Text className="text-2xl font-bold text-slate-900 text-center">Report a Bug</Text>
          <Text className="text-slate-500 text-center mt-2 px-4 leading-5">
            It would be great if you report bugs so we can fix them quickly! If you have any issues that can't be sent via email, please GChat me at <Text className="font-semibold text-slate-700">donald.colin@kalvium.com</Text> for faster updates.
          </Text>
        </View>

        <View className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex-row items-start mb-2">
          <Info color="#2563EB" size={20} style={{ marginRight: 12, marginTop: 2 }} />
          <Text className="text-blue-800 flex-1 leading-5">
            When you tap submit, your default email app will open so you can attach screenshots if needed!
          </Text>
        </View>

        <VStack space="sm" className="mb-4">
          <Text className="text-sm font-semibold text-slate-700 ml-1">What went wrong?</Text>
          <TextInput
            style={{
              backgroundColor: '#FFFFFF',
              borderWidth: 1,
              borderColor: '#E2E8F0',
              borderRadius: 16,
              padding: 16,
              paddingTop: 16,
              fontSize: 16,
              minHeight: 150,
              color: '#0F172A',
            }}
            placeholder="e.g. The map wasn't loading when I started the walk-in..."
            placeholderTextColor="#94A3B8"
            multiline
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />
        </VStack>

        <Button
          size="lg"
          onPress={handleSubmit}
          disabled={isSubmitting || !description.trim()}
          className={`h-14 rounded-2xl ${description.trim() ? 'bg-red-600' : 'bg-slate-300'}`}
        >
          {isSubmitting ? <ButtonSpinner color="#fff" /> : null}
          <ButtonText className="font-bold text-lg">Send Bug Report</ButtonText>
        </Button>

        {/* Spacer to push watermark to the bottom */}
        <View className="flex-1 min-h-[40px]" />

        <View className="items-center pb-4 opacity-50">
          <Text className="text-slate-400 text-xs tracking-widest uppercase font-medium">
            Made with ❤️ by Donald Colin
          </Text>
        </View>
      </VStack>
    </ScrollView>
  );
}
