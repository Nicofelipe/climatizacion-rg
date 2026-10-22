import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { View } from 'react-native';
import PasswordReminder from '@/components/common/PasswordReminder';

export default function ProtectedLayout() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  return (
    <View style={{flex:1}}><PasswordReminder/>
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
    </View>
  );
}
