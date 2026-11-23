import { Redirect, router, Stack } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import NotificationCenter from '@/components/common/NotificationCenter';
import PasswordReminder from '@/components/common/PasswordReminder';
import { useAuth } from '@/hooks/useAuth';
import { recoverCapture } from '@/utils/pendingCapture';

export default function ProtectedLayout() {
  const { isAuthenticated, user } = useAuth();
  const userId = user?.id, companyId = user?.companyId;
  useEffect(() => {
    if (!userId || !companyId) return;
    let active = true;
    void recoverCapture(userId, companyId).then(form => {
      if (active && form) router.push({ pathname: '/(protected)/expenses/create', params: form.editId ? { editId: String(form.editId) } : {} });
    });
    return () => { active = false; };
  }, [userId, companyId]);
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  return (
    <View style={{ flex: 1 }}>
      <PasswordReminder />
      <NotificationCenter />
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}
