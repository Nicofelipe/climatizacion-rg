import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { View,Text } from 'react-native';
import PasswordReminder from '@/components/common/PasswordReminder';
import NotificationCenter from '@/components/common/NotificationCenter';

export default function ProtectedLayout() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  return (
    <View style={{flex:1}}><View style={{padding:8,backgroundColor:'#FFF4D6'}}><Text style={{fontSize:11,textAlign:'center',color:'#74520A'}}>CLEPIT PRUEBAS · Escaneo experimental · Guardar registra en tu empresa</Text></View><PasswordReminder/>
    <NotificationCenter/>
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
    </View>
  );
}
