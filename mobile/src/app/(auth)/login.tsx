import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ApiError } from '@/api/http';
import ClepitBrand from '@/components/common/ClepitBrand';
import FormScrollView from '@/components/common/FormScrollView';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Text from '@/components/ui/Text';
import { Banner, IconName, Sheet, styles as kit, useWide } from '@/components/ui/kit';
import { useAuth } from '@/hooks/useAuth';
import { BorderRadius, Colors, Shadows } from '@/theme';

const REMEMBERED = 'remembered-login-email';
const points: [IconName, string, string][] = [
  ['camera-outline', 'Toma la foto', 'Los datos se leen solos, incluso desde el timbre del SII.'],
  ['checkmark-done-outline', 'Se revisa y se aprueba', 'Cada cambio queda registrado con nombre y fecha.'],
  ['bar-chart-outline', 'El gasto queda claro', 'Presupuesto, reportes y Excel listos para la contadora.'],
];

export default function LoginScreen() {
  const { login, loginWithGoogle, isLoading, isAuthenticated } = useAuth();
  const wide = useWide();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState<{ id: number; name: string }[]>([]);
  useEffect(() => { AsyncStorage.getItem(REMEMBERED).then(value => { if (value) { setEmail(value); setRemember(true); } }).catch(() => {}); }, []);

  if (isAuthenticated) return <Redirect href="/(protected)/(tabs)" />;

  async function submit(companyId?: number) {
    if (isLoading || !email.trim() || !password) return;
    setError('');
    try {
      const address = email.trim().toLowerCase();
      await login({ email: address, password, ...(companyId ? { companyId } : {}) });
      await (remember ? AsyncStorage.setItem(REMEMBERED, address) : AsyncStorage.removeItem(REMEMBERED)).catch(() => {});
      setCompanies([]);
      router.replace('/(protected)/(tabs)');
    } catch (failure) {
      if (failure instanceof ApiError && failure.code === 'COMPANY_SELECTION_REQUIRED') { setCompanies(failure.data.companies); return; }
      setCompanies([]);
      setError(failure instanceof Error ? failure.message : 'No fue posible iniciar sesión.');
    }
  }
  async function google() {
    if (isLoading) return;
    setError('');
    try { await loginWithGoogle(); router.replace('/(protected)/(tabs)'); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'No fue posible ingresar con Google.'); }
  }

  const form = <View style={s.form}>
    {!wide ? <View style={{ alignItems: 'center', paddingBottom: 6 }}><ClepitBrand size={56} /></View> : null}
    <View style={{ gap: 4 }}><Text accessibilityRole="header" style={kit.title}>Iniciar sesión</Text><Text style={kit.subtitle}>Usa la cuenta que registró tu empresa.</Text></View>
    <Input label="Correo" icon="mail-outline" value={email} onChangeText={setEmail} placeholder="nombre@empresa.cl" keyboardType="email-address" />
    <Input label="Contraseña" icon="lock-closed-outline" value={password} onChangeText={setPassword} placeholder="Tu contraseña" secureTextEntry onSubmitEditing={() => { void submit(); }} />
    <View style={kit.between}>
      <Pressable accessibilityRole="checkbox" aria-checked={remember} onPress={() => setRemember(value => !value)} style={[kit.row, { gap: 8, paddingVertical: 4 }]}>
        <Ionicons name={remember ? 'checkbox' : 'square-outline'} size={22} color={remember ? Colors.primary : Colors.textMuted} /><Text style={{ fontSize: 14, color: Colors.textSecondary }}>Recordar mi correo</Text>
      </Pressable>
      <Pressable accessibilityRole="link" onPress={() => router.push('/(auth)/forgot-password')} hitSlop={8}><Text style={{ fontSize: 14, fontWeight: '600', color: Colors.primaryText }}>Olvidé mi contraseña</Text></Pressable>
    </View>
    {error ? <Banner tone="danger">{error}</Banner> : null}
    <Button title="Entrar" onPress={() => { void submit(); }} loading={isLoading} disabled={!email.trim() || !password} />
    <Button variant="secondary" icon="logo-google" title="Entrar con Google" disabled={isLoading} onPress={() => { void google(); }} />
    <Text style={[kit.caption, { textAlign: 'center' }]}>Con Google, elige el mismo correo que registró tu empresa. ¿No tienes acceso? Pídeselo a tu administrador.</Text>
  </View>;

  return <View style={[kit.page, { flexDirection: 'row' }]}>
    {wide ? <View style={s.panel}>
      <ClepitBrand size={62} light />
      <View style={{ gap: 26 }}>
        <Text style={s.headline}>Cada boleta cuenta.{'\n'}Ninguna se pierde.</Text>
        <View style={{ gap: 20 }}>{points.map(([icon, title, text]) => <View key={title} style={[kit.row, { gap: 14, alignItems: 'flex-start' }]}>
          <View style={s.point}><Ionicons name={icon} size={20} color={Colors.ink} /></View>
          <View style={{ flex: 1, gap: 2 }}><Text style={{ color: Colors.white, fontWeight: '700', fontSize: 16 }}>{title}</Text><Text style={{ color: Colors.inkSoft, fontSize: 14, lineHeight: 21 }}>{text}</Text></View>
        </View>)}</View>
      </View>
      <Text style={{ color: Colors.inkSoft, fontSize: 13 }}>Un producto Clepit</Text>
    </View> : null}
    <FormScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll}>{form}</FormScrollView>
    <Sheet visible={companies.length > 0} title="¿A qué empresa quieres entrar?" onClose={() => setCompanies([])}>
      <Text style={kit.subtitle}>Tu correo está registrado en más de una.</Text>
      {companies.map(company => <Button key={company.id} variant="secondary" icon="business-outline" title={company.name} loading={isLoading} onPress={() => { void submit(company.id); }} />)}
    </Sheet>
  </View>;
}

const s = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  form: { width: '100%', maxWidth: 430, alignSelf: 'center', gap: 16, padding: 24, borderRadius: BorderRadius.xxl, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, ...Shadows.card },
  panel: { width: '44%', maxWidth: 620, backgroundColor: Colors.ink, padding: 48, justifyContent: 'space-between' },
  headline: { color: Colors.white, fontSize: 42, lineHeight: 48, fontWeight: '800', letterSpacing: -1.2 },
  point: { width: 40, height: 40, borderRadius: 13, backgroundColor: Colors.sunny, alignItems: 'center', justifyContent: 'center' },
});
