/**
 * Root navigator — routes to Auth, Executive, or Manager based on state.
 */
import React from 'react';
import { useAuthStore } from '../stores/authStore';
import AuthNavigator from './AuthNavigator';
import ExecutiveNavigator from './ExecutiveNavigator';
import PermissionGateScreen, { usePermissionGate } from '../screens/PermissionGateScreen';

import { VStack } from '@/components/ui/vstack';
import { Spinner } from '@/components/ui/spinner';

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const { isComplete: isPermissionsComplete, markComplete } = usePermissionGate();

  if (isLoading || isPermissionsComplete === null) {
    return (
      <VStack className="flex-1 justify-center items-center bg-background">
        <Spinner size="large" color="#E11D48" />
      </VStack>
    );
  }

  if (!isAuthenticated) {
    return <AuthNavigator />;
  }

  if (!isPermissionsComplete) {
    return <PermissionGateScreen onComplete={markComplete} />;
  }

  return <ExecutiveNavigator />;
}
