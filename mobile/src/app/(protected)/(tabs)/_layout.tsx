import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { router, Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import ClepitBrand from '@/components/common/ClepitBrand';
import Button from '@/components/ui/Button';
import Text from '@/components/ui/Text';
import { IconName, useWide } from '@/components/ui/kit';
import { useAuth } from '@/hooks/useAuth';
import { usePendingReviews } from '@/hooks/usePendingReviews';
import { BorderRadius, Colors, Shadows } from '@/theme';

const icons: Record<string, [IconName, IconName]> = {
  index: ['home-outline', 'home'], expenses: ['receipt-outline', 'receipt'], reports: ['bar-chart-outline', 'bar-chart'],
  employees: ['people-outline', 'people'], profile: ['person-circle-outline', 'person-circle'],
};
const titles: Record<string, string> = { index: 'Inicio', expenses: 'Boletas', reports: 'Reportes', employees: 'Equipo', profile: 'Perfil' };

/** Barra inferior en el teléfono y menú lateral en escritorio, con las mismas secciones. */
function Navigation({ state, navigation, admin, pending }: Pick<BottomTabBarProps, 'state' | 'navigation'> & { admin: boolean; pending: number }) {
  const wide = useWide();
  const { user } = useAuth();
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setTyping(true)), hide = Keyboard.addListener('keyboardDidHide', () => setTyping(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const routes = state.routes.filter(route => titles[route.name] && (admin || route.name !== 'employees'));
  const open = (key: string, name: string) => {
    const event = navigation.emit({ type: 'tabPress', target: key, canPreventDefault: true });
    if (!event.defaultPrevented) navigation.navigate(name);
  };
  if (!wide && typing) return null;
  const items = routes.map(route => {
    const active = state.routes[state.index].key === route.key;
    const badge = route.name === 'expenses' && pending > 0 ? pending > 99 ? '99+' : String(pending) : '';
    return <Pressable key={route.key} accessibilityRole="tab" aria-selected={active} accessibilityLabel={badge ? `${titles[route.name]}, ${badge} por revisar` : titles[route.name]}
      onPress={() => open(route.key, route.name)} style={wide ? [s.sideItem, active && { backgroundColor: Colors.primarySoft }] : s.tab}>
      <View>
        <Ionicons name={icons[route.name][active ? 1 : 0]} size={wide ? 21 : 23} color={active ? Colors.primary : Colors.textMuted} />
        {badge && !wide ? <View style={s.badge}><Text style={s.badgeText}>{badge}</Text></View> : null}
      </View>
      <Text style={{ fontSize: wide ? 14 : 11, fontWeight: active ? '700' : '600', color: active ? Colors.primaryText : Colors.textMuted, flex: wide ? 1 : undefined }}>{titles[route.name]}</Text>
      {badge && wide ? <View style={s.sideBadge}><Text style={s.badgeText}>{badge}</Text></View> : null}
    </Pressable>;
  });
  if (wide) return <View accessibilityRole="tablist" style={s.side}>
    <View style={{ paddingHorizontal: 6, paddingBottom: 22 }}><ClepitBrand size={40} /></View>
    <Button title="Registrar boleta" icon="add" onPress={() => router.push('/(protected)/expenses/create')} style={{ marginBottom: 16 }} />
    {items}
    <View style={{ flex: 1 }} />
    <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '700', paddingHorizontal: 12 }}>{user?.firstName} {user?.lastName}</Text>
    <Text numberOfLines={1} style={{ fontSize: 12, color: Colors.textMuted, paddingHorizontal: 12, paddingBottom: 8 }}>{admin ? 'Supervisor / administrador' : 'Trabajador'}</Text>
  </View>;
  // El botón de registrar va al centro: es la acción principal.
  const middle = Math.ceil(items.length / 2);
  return <View accessibilityRole="tablist" style={s.bar}>
    {items.slice(0, middle)}
    <Pressable accessibilityRole="button" accessibilityLabel="Registrar una boleta" onPress={() => router.push('/(protected)/expenses/create')} style={({ pressed }) => [s.add, pressed && { backgroundColor: Colors.primaryDark }]}><Ionicons name="add" size={30} color={Colors.white} /></Pressable>
    {items.slice(middle)}
  </View>;
}

export default function TabsLayout() {
  const { user, token } = useAuth();
  const wide = useWide();
  const admin = user?.role === 'ADMIN';
  const { count } = usePendingReviews(token, admin);
  return <Tabs safeAreaInsets={{ top: 0, bottom: 0, left: 0, right: 0 }} screenOptions={{ headerShown: false, tabBarPosition: wide ? 'left' : 'bottom', sceneStyle: { backgroundColor: Colors.background } }}
    tabBar={props => <Navigation state={props.state} navigation={props.navigation} admin={admin} pending={count} />}>
    {Object.entries(titles).map(([name, title]) => <Tabs.Screen key={name} name={name} options={{ title, href: name === 'employees' && !admin ? null : undefined }} />)}
  </Tabs>;
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border, paddingHorizontal: 6, height: 66 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, height: 62 },
  add: { width: 54, height: 54, borderRadius: 27, marginTop: -24, marginHorizontal: 4, backgroundColor: Colors.primary, borderWidth: 4, borderColor: Colors.background, alignItems: 'center', justifyContent: 'center', ...Shadows.primary },
  badge: { position: 'absolute', top: -6, right: -12, minWidth: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: Colors.accent, alignItems: 'center' },
  sideBadge: { minWidth: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: Colors.accent, alignItems: 'center' },
  badgeText: { color: Colors.white, fontSize: 11, lineHeight: 18, fontWeight: '700' },
  side: { width: 236, backgroundColor: Colors.surface, borderRightWidth: 1, borderRightColor: Colors.border, padding: 16, paddingTop: 22, gap: 4 },
  sideItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12, borderRadius: BorderRadius.md },
});
