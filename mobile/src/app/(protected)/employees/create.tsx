import { useState } from 'react';
import { Redirect, router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { createEmployeeApi } from '@/api/user.api';
import AppContainer from '@/components/layout/AppContainer';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { Colors, Spacing } from '@/theme';

export default function CreateEmployeeScreen() {
  const { user, token } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (user?.role !== 'ADMIN') return <Redirect href="/(protected)/(tabs)" />;

  async function submit() {
    if (!token || saving) return;
    setError(null);
    if (!firstName.trim() || !lastName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || password.length < 8) {
      setError('Completa nombre, apellido, un correo válido y una contraseña de al menos 8 caracteres.');
      return;
    }
    setSaving(true);
    try {
      await createEmployeeApi(token, { firstName: firstName.trim(), lastName: lastName.trim(),
        email: email.trim().toLowerCase(), password, phone: phone.trim() || undefined });
      setPassword('');
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible registrar al trabajador.');
    } finally { setSaving(false); }
  }

  return (
    <AppContainer>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: Spacing.md, paddingBottom: 32 }}>
        <Text style={{ fontSize: 28, color: Colors.text, fontWeight: '700' }}>Registrar trabajador</Text>
        {success ? (
          <View style={{ gap: Spacing.lg }}>
            <Text accessibilityRole="alert" style={{ color: Colors.success }}>Trabajador registrado correctamente.</Text>
            <Text style={{ color: Colors.text }}>{email.trim().toLowerCase()} ya puede ingresar con su correo y contraseña. Comparte el acceso por un canal privado.</Text>
            <Button title="Volver a mi cuenta" onPress={() => router.replace('/(protected)/(tabs)/profile')} />
          </View>
        ) : (
          <>
            <Text style={{ color: Colors.textSecondary }}>La cuenta quedará vinculada a tu empresa con rol de trabajador.</Text>
            <Input label="Nombre" value={firstName} onChangeText={setFirstName} />
            <Input label="Apellido" value={lastName} onChangeText={setLastName} />
            <Input label="Correo del trabajador" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="nombre@empresa.cl" />
            <Input label="Contraseña inicial (mínimo 8 caracteres)" value={password} onChangeText={setPassword} secureTextEntry />
            <Input label="Teléfono (opcional)" value={phone} onChangeText={setPhone} />
            {error ? <Text accessibilityRole="alert" style={{ color: Colors.danger }}>{error}</Text> : null}
            <Button title="Crear acceso" onPress={submit} loading={saving} />
            <Button title="Volver" onPress={() => router.back()} disabled={saving} />
          </>
        )}
      </ScrollView>
    </AppContainer>
  );
}
