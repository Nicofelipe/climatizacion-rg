import { Stack } from 'expo-router';
import { SafeAreaProvider,SafeAreaView,initialWindowMetrics } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import KeyboardRoot from '@/components/common/KeyboardRoot';

import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}><KeyboardRoot>
    <SafeAreaView style={{flex:1,backgroundColor:'#F5F7FB'}}>
    <StatusBar style="dark"/>
    <AuthProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </AuthProvider>
    </SafeAreaView></KeyboardRoot></SafeAreaProvider>
  );
}
