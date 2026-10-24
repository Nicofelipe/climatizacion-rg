import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { View } from 'react-native';
import PasswordReminder from '@/components/common/PasswordReminder';
import NotificationCenter from '@/components/common/NotificationCenter';

export default function ProtectedLayout() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  return (
    <View style={{flex:1}}><PasswordReminder/>
    <NotificationCenter/>
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
    </View>
  );
}
