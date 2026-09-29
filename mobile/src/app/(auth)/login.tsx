import { useState } from 'react';

import { router } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { Colors, Spacing, Typography } from '@/theme';

export default function LoginScreen() {
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleLogin() {
    try {
      await login({
        email: email.trim(),
        password,
      });

      router.replace('/(protected)/(tabs)');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No fue posible iniciar sesión';

      Alert.alert('Error', message);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>
          Climatización RG
        </Text>

        <Text style={styles.subtitle}>
          Inicia sesión para continuar
        </Text>

        <View style={styles.form}>
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
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
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
  },
});