import FormScrollView from '@/components/common/FormScrollView';
import ClepitBrand from '@/components/common/ClepitBrand';
import { useEffect,useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Ionicons} from '@expo/vector-icons';

import { Redirect, router } from 'expo-router';
import { Pressable,ScrollView, StyleSheet, Text, View } from 'react-native';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { Colors, Spacing, Typography } from '@/theme';

export default function LoginScreen() {
  const { login, loginWithGoogle, isLoading, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberEmail,setRememberEmail]=useState(false);
  useEffect(()=>{void AsyncStorage.getItem('remembered-login-email').then(value=>{if(value){setEmail(value);setRememberEmail(true);}}).catch(()=>{});},[]);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) return <Redirect href="/(protected)/(tabs)" />;

  async function handleLogin() {
    if (isLoading) return;
    setError(null);
    try {
      await login({
        email: email.trim().toLowerCase(),
        password,
      });
      if(rememberEmail)await AsyncStorage.setItem('remembered-login-email',email.trim().toLowerCase()).catch(()=>{});
      else await AsyncStorage.removeItem('remembered-login-email').catch(()=>{});

      router.replace('/(protected)/(tabs)');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No fue posible iniciar sesión';

      setError(message);
    }
  }

  return (
    <FormScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <Text style={styles.eyebrow}>GESTIÓN DE BOLETAS</Text>
        <ClepitBrand width={240}/>

        <Text style={styles.subtitle}>
          Tus gastos y respaldos, en un solo lugar.
        </Text>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Bienvenido</Text>
          <Text style={styles.help}>Ingresa con la cuenta que registró el administrador de tu empresa.</Text>
          <Input
            label="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            placeholder="correo@empresa.cl"
            keyboardType="email-address"
          />

          <Input
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            placeholder="Ingresa tu contraseña"
            secureTextEntry
          />

          <Pressable accessibilityRole="checkbox" accessibilityState={{checked:rememberEmail}} onPress={()=>{setRememberEmail(value=>!value);if(rememberEmail)void AsyncStorage.removeItem('remembered-login-email');}} style={{flexDirection:'row',alignItems:'center',gap:9,paddingVertical:8}}><Ionicons name={rememberEmail?'checkbox':'square-outline'} size={23} color={Colors.primary}/><Text style={{color:Colors.text}}>Recordar mi correo</Text></Pressable>
          <Button
            title="Iniciar sesión"
            onPress={handleLogin}
            loading={isLoading}
            disabled={!email.trim() || !password}
          />
          <View style={{marginTop:12}}><Button variant="secondary" title="Continuar con Google" disabled={isLoading} onPress={()=>{if(isLoading)return;setError(null);void loginWithGoogle().then(()=>router.replace('/(protected)/(tabs)')).catch(error=>setError(error instanceof Error?error.message:'No fue posible ingresar con Google.'));}}/></View>
          <Text style={{fontSize:12,color:Colors.textSecondary,lineHeight:19,marginTop:10}}>Elige en Google el mismo correo que registró tu empresa. No necesitas escribir la contraseña de Clepit para esta opción.</Text>
          {error ? <View accessibilityRole="alert" style={{backgroundColor:'#FEF2F2',borderRadius:12,padding:12,marginTop:12}}><Text style={{color:'#991B1B',lineHeight:21}}>{error}</Text></View> : null}
          <Pressable accessibilityRole="button" onPress={()=>router.push('/(auth)/forgot-password')} style={{paddingVertical:14}}><Text style={{color:Colors.primary,fontWeight:'600',fontSize:13}}>Olvidé mi contraseña</Text></Pressable>
          <Text style={styles.help}>¿No tienes acceso? Solicita al encargado que registre tu correo y te entregue tu contraseña por un canal privado.</Text>
        </View>
      </View>
    </FormScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },

  content: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },

  title: {
    fontSize: Typography.title,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },

  subtitle: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
    fontSize: Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  form: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  eyebrow: { textAlign: 'center', color: Colors.primary, fontWeight: '700', letterSpacing: 2, marginBottom: Spacing.md },
  formTitle: { fontSize: 24, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  help: { color: Colors.textSecondary, lineHeight: 22, marginVertical: Spacing.md },
  error: { color: Colors.danger, marginTop: Spacing.md },
});
