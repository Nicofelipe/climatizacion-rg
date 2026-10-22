import { useState } from 'react';

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
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <Text style={styles.eyebrow}>GESTIÓN DE BOLETAS</Text>
        <Text style={styles.title}>
          Climatización RG
        </Text>

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

          <Button
            title="Iniciar sesión"
            onPress={handleLogin}
            loading={isLoading}
            disabled={!email.trim() || !password}
          />
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <Pressable accessibilityRole="button" onPress={()=>router.push('/(auth)/forgot-password')} style={{paddingVertical:14}}><Text style={{color:Colors.primary,fontWeight:'600',fontSize:13}}>Olvidé mi contraseña</Text></Pressable>
          <Text style={[styles.help,{textAlign:'center'}]}>o continúa con tu cuenta registrada</Text>
          <Button title="Continuar con Google" loading={isLoading} disabled={isLoading} onPress={async()=>{setError(null);try{await loginWithGoogle();router.replace('/(protected)/(tabs)');}catch(err){setError(err instanceof Error?err.message:'No fue posible ingresar con Google.');}}}/>
          <Text style={styles.help}>¿No tienes acceso? Solicita al encargado que registre tu correo y te entregue tu contraseña por un canal privado.</Text>
        </View>
      </View>
    </ScrollView>
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
