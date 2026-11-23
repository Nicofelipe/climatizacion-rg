import { BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import Head from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { initialWindowMetrics, SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import KeyboardRoot from '@/components/common/KeyboardRoot';
import { AuthProvider } from '@/contexts/AuthContext';
import { Colors } from '@/theme';

export default function RootLayout() {
  const [ready, failed] = useFonts({
    BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold,
    PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
  });
  // En la web el texto se muestra con la fuente de respaldo mientras carga; en el teléfono la carga es inmediata.
  if (Platform.OS !== 'web' && !ready && !failed) return null;
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <KeyboardRoot>
        {Platform.OS === 'web' ? <Head><title>Clepit · Gestión de boletas</title><meta name="robots" content="noindex, nofollow" /></Head> : null}
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
          <StatusBar style="dark" />
          <AuthProvider><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }} /></AuthProvider>
        </SafeAreaView>
      </KeyboardRoot>
    </SafeAreaProvider>
  );
}
