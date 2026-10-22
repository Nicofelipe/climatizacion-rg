import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useExpenseDashboard } from '@/hooks/useExpenseDashboard';
import { availablePeriodOptions } from '@/utils/periodOptions';
import { Colors } from '@/theme';

const avatars = [
  { name: 'Iniciales', icon: null, color: '#0F8277', light: '#DDF4ED' },
  { name: 'Explorador', icon: 'planet-outline', color: '#6D51B9', light: '#EDE9FE' },
  { name: 'Energía', icon: 'flash-outline', color: '#A7670B', light: '#FFF0D0' },
  { name: 'Naturaleza', icon: 'leaf-outline', color: '#23724B', light: '#DDF3E5' },
  { name: 'Estrella', icon: 'sparkles-outline', color: '#B24B7C', light: '#FCE7F0' },
  { name: 'Montaña', icon: 'trail-sign-outline', color: '#315DA0', light: '#E1EBFC' },
] as const;

export default function ProfileOverview() {
  const { user, token, logout } = useAuth();
  const [avatar, setAvatar] = useState(0);
  const [choosing, setChoosing] = useState(false);
  const [message, setMessage] = useState('');
  const fade = useRef(new Animated.Value(0)).current;
  const { data } = useExpenseDashboard(token, availablePeriodOptions(0).currentPeriod, 'month');
  const admin = user?.role === 'ADMIN';
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();
  const key = `profile-avatar:${user?.companyId}:${user?.id}`;
  const appearance = avatars[avatar] ?? avatars[0];
  useEffect(() => {
    let active = true;
    setAvatar(0);
    AsyncStorage.getItem(key).then(value => { if (active && value !== null && /^\d+$/.test(value) && Number(value) < avatars.length) setAvatar(Number(value)); }).catch(() => {});
    return () => { active = false; };
  }, [key]);
  useEffect(() => { Animated.timing(fade, { toValue: 1, duration: 350, useNativeDriver: true }).start(); }, [fade]);
  async function selectAvatar(index: number) {
    try { await AsyncStorage.setItem(key, String(index)); setAvatar(index); setChoosing(false); setMessage('Avatar actualizado en este dispositivo.'); }
    catch { setMessage('No pudimos guardar el avatar. Inténtalo nuevamente.'); }
  }
  return <SafeAreaView style={s.page} edges={['top', 'left', 'right']}><ScrollView contentContainerStyle={s.content}>
    <Text style={s.eyebrow}>TU ESPACIO PERSONAL</Text><Text style={s.title}>Mi perfil</Text>
    <Text style={s.subtitle}>Tu cuenta, tu identidad y todo listo para seguir.</Text>
    <Animated.View style={[s.hero, { opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
      <View style={s.orbit} />
      <Pressable accessibilityRole="button" accessibilityLabel="Cambiar avatar" onPress={() => setChoosing(true)}>
        <View style={[s.avatar, { backgroundColor: appearance.light }]}>{appearance.icon ? <Ionicons name={appearance.icon} size={43} color={appearance.color} /> : <Text style={[s.initials, { color: appearance.color }]}>{initials}</Text>}</View>
        <View style={s.edit}><Ionicons name="pencil" size={13} color="white" /></View>
      </Pressable>
      <Text style={s.name}>{user?.firstName} {user?.lastName}</Text><Text style={s.heroEmail}>{user?.email}</Text>
      <View style={s.badge}><Ionicons name={admin ? 'shield-checkmark-outline' : 'person-outline'} size={14} color="#A1E2CE" /><Text style={s.badgeText}>{admin ? 'Administrador de empresa' : 'Trabajador'}</Text></View>
      <Text style={s.company}>{data?.companyName ?? 'Cuenta de empresa'}</Text>
    </Animated.View>
    {message ? <Text accessibilityRole="alert" style={s.notice}>{message}</Text> : null}
    <View style={s.panel}><Text style={s.section}>Información de tu cuenta</Text>
      <Info icon="person-outline" label="Nombre completo" value={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`} />
      <Info icon="mail-outline" label="Correo de acceso" value={user?.email ?? ''} />
      <Info icon="briefcase-outline" label="Empresa" value={data?.companyName ?? 'Tu empresa'} />
      <Info icon="shield-checkmark-outline" label="Rol" value={admin ? 'Administrador de empresa' : 'Trabajador'} />
      <Text style={s.hint}>Para actualizar tu nombre o correo, contacta al administrador de tu empresa.</Text>
    </View>
    <View style={s.panel}><Text style={s.section}>A tu alcance</Text>
      <Action icon="receipt-outline" title={admin ? 'Boletas de la empresa' : 'Mis boletas'} description="Revisa los registros y sus estados" onPress={() => router.push('/(protected)/(tabs)/expenses')} />
      <Action icon="analytics-outline" title="Reportes" description="Descubre cómo evolucionan los gastos" onPress={() => router.push('/(protected)/(tabs)/reports')} />
      {admin ? <><Action icon="people-outline" title="Gestionar trabajadores" description="Registra y actualiza los datos de tu equipo" onPress={() => router.push('/(protected)/employees')} /><Action icon="cloud-outline" title="Conexión de Google Drive" description="Gestiona la conexión del respaldo de tu empresa" onPress={() => router.push('/(protected)/storage')} /></> : null}
    </View>
    <View style={s.privacy}><Ionicons name="lock-closed-outline" size={23} color={Colors.primary} /><View style={{ flex: 1, gap: 5 }}><Text style={s.label}>Un espacio para tu empresa</Text><Text style={s.hint}>{admin ? 'Tu acceso está limitado a la información de tu empresa.' : 'Tu cuenta te permite consultar tus propias boletas. El respaldo de imágenes lo gestiona tu empresa.'}</Text></View></View>
    <Pressable accessibilityRole="button" onPress={logout} style={s.logout}><Ionicons name="log-out-outline" size={21} color="#B94141" /><Text style={s.logoutText}>Cerrar sesión</Text></Pressable>
    <Text style={s.footer}>Cada boleta cuenta. Gracias por mantener tus registros al día.</Text>
  </ScrollView>
    <Modal visible={choosing} transparent animationType="fade" onRequestClose={() => setChoosing(false)}><View style={s.overlay}><View style={s.dialog} accessibilityViewIsModal>
      <View style={s.dialogHeader}><Text style={s.section}>Elige tu avatar</Text><Pressable accessibilityRole="button" accessibilityLabel="Cerrar selector de avatar" onPress={() => setChoosing(false)}><Ionicons name="close" size={25} color={Colors.text} /></Pressable></View>
      <Text style={s.hint}>Dale un toque tuyo. Se guarda en este dispositivo para tu cuenta.</Text>
      <View style={s.options}>{avatars.map((item, index) => <Pressable key={item.name} accessibilityRole="button" accessibilityLabel={`Avatar ${item.name}`} accessibilityState={{ selected: avatar === index }} onPress={() => selectAvatar(index)} style={[s.option, { borderColor: avatar === index ? item.color : 'transparent' }]}><View style={[s.optionAvatar, { backgroundColor: item.light }]}>{item.icon ? <Ionicons name={item.icon} size={30} color={item.color} /> : <Text style={{ fontSize: 23, fontWeight: '800', color: item.color }}>{initials}</Text>}</View><Text style={s.hint}>{item.name}</Text></Pressable>)}</View>
    </View></View></Modal>
  </SafeAreaView>;
}
function Info({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return <View style={s.info}><View style={s.icon}><Ionicons name={icon} size={20} color={Colors.primary} /></View><View style={{ flex: 1, gap: 5 }}><Text style={s.hint}>{label}</Text><Text selectable style={s.label}>{value}</Text></View></View>;
}
function Action({ icon, title, description, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; description: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.info, { opacity: pressed ? 0.65 : 1 }]}><View style={s.icon}><Ionicons name={icon} size={21} color={Colors.primary} /></View><View style={{ flex: 1, gap: 5 }}><Text style={s.label}>{title}</Text><Text style={s.hint}>{description}</Text></View><Ionicons name="chevron-forward" size={18} color="#8B98AD" /></Pressable>;
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.background }, content: { padding: 20, paddingBottom: 35, gap: 18, width: '100%', maxWidth: 760, alignSelf: 'center' },
  eyebrow: { fontSize: 10, letterSpacing: 1.5, fontWeight: '700', color: Colors.textSecondary }, title: { fontSize: 32, fontWeight: '800', letterSpacing: -1, color: Colors.text }, subtitle: { fontSize: 13, lineHeight: 21, color: Colors.textSecondary },
  hero: { backgroundColor: '#17233D', padding: 28, borderRadius: 25, alignItems: 'center', gap: 13, overflow: 'hidden' }, orbit: { position: 'absolute', top: -90, right: -65, width: 240, height: 240, borderWidth: 35, borderColor: '#203451', borderRadius: 120 },
  avatar: { width: 92, height: 92, borderRadius: 32, justifyContent: 'center', alignItems: 'center' }, initials: { fontSize: 34, fontWeight: '800' }, edit: { position: 'absolute', right: -5, bottom: -5, width: 29, height: 29, borderRadius: 15, backgroundColor: Colors.primary, borderWidth: 3, borderColor: '#17233D', alignItems: 'center', justifyContent: 'center' },
  name: { color: 'white', fontSize: 24, fontWeight: '700', textAlign: 'center' }, heroEmail: { color: '#BDCAE0', fontSize: 13, textAlign: 'center' }, badge: { flexDirection: 'row', gap: 7, backgroundColor: '#24433F', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, alignItems: 'center' }, badgeText: { color: '#A1E2CE', fontSize: 12, fontWeight: '600' }, company: { color: '#AABBD5', fontSize: 12, textAlign: 'center', lineHeight: 20 },
  panel: { backgroundColor: 'white', padding: 22, borderWidth: 1, borderColor: Colors.border, borderRadius: 22, gap: 16 }, section: { color: Colors.text, fontSize: 19, fontWeight: '700' }, info: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 7 }, icon: { width: 39, height: 39, borderRadius: 13, backgroundColor: '#E5F5EF', alignItems: 'center', justifyContent: 'center' }, label: { color: Colors.text, fontSize: 14, fontWeight: '600', lineHeight: 21 }, hint: { color: Colors.textSecondary, fontSize: 12, lineHeight: 19 },
  privacy: { flexDirection: 'row', gap: 14, padding: 20, borderRadius: 20, backgroundColor: '#EAF6F1', alignItems: 'center' }, logout: { flexDirection: 'row', gap: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF2F2', padding: 17, borderRadius: 15, borderWidth: 1, borderColor: '#F4DCDC' }, logoutText: { color: '#B94141', fontWeight: '700', fontSize: 14 }, footer: { textAlign: 'center', color: Colors.textSecondary, fontSize: 11, lineHeight: 19 }, notice: { color: Colors.primary, fontSize: 12, lineHeight: 20 },
  overlay: { flex: 1, backgroundColor: '#0B183A88', alignItems: 'center', justifyContent: 'center', padding: 20 }, dialog: { backgroundColor: 'white', borderRadius: 24, padding: 24, maxWidth: 440, width: '100%', gap: 18 }, dialogHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }, option: { width: 100, padding: 8, borderRadius: 16, borderWidth: 2, alignItems: 'center', gap: 7 }, optionAvatar: { width: 56, height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
});
