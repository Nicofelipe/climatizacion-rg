// Piezas comunes de las pantallas. Cambiar una aquí la cambia en toda la app.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ReactNode } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleProp, StyleSheet, useWindowDimensions, View, ViewStyle } from 'react-native';
import Text from '@/components/ui/Text';
import { BorderRadius, Colors, Shadows } from '@/theme';

export type IconName = keyof typeof Ionicons.glyphMap;
export type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export const tones: Record<Tone, { ink: string; soft: string }> = {
  primary: { ink: Colors.primaryText, soft: Colors.primarySoft }, success: { ink: Colors.success, soft: Colors.successSoft },
  warning: { ink: Colors.warning, soft: Colors.warningSoft }, danger: { ink: Colors.danger, soft: Colors.dangerSoft },
  info: { ink: Colors.info, soft: Colors.infoSoft }, neutral: { ink: Colors.textSecondary, soft: '#EDF2F3' },
};

/** Escritorio: menú lateral y contenido en columnas. */
export function useWide() {
  return useWindowDimensions().width >= 960;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ title, caption, action }: { title: string; caption?: string; action?: ReactNode }) {
  return <View style={styles.between}>
    <View style={{ flex: 1, gap: 3 }}><Text style={styles.sectionTitle}>{title}</Text>{caption ? <Text style={styles.caption}>{caption}</Text> : null}</View>
    {action}
  </View>;
}

export function ScreenHeader({ title, subtitle, eyebrow, back, right }: { title: string; subtitle?: string; eyebrow?: string; back?: boolean | (() => void); right?: ReactNode }) {
  const wide = useWide();
  return <View style={{ gap: 10, paddingRight: wide && !right ? 110 : 0, marginTop: wide && right ? 46 : 0 }}>
    {back ? <Pressable accessibilityRole="button" accessibilityLabel="Volver" hitSlop={8} style={styles.back}
      onPress={() => { if (typeof back === 'function') back(); else if (router.canGoBack()) router.back(); else router.replace('/(protected)/(tabs)'); }}>
      <Ionicons name="chevron-back" size={18} color={Colors.primaryText} /><Text style={{ color: Colors.primaryText, fontWeight: '600', fontSize: 14 }}>Volver</Text>
    </Pressable> : null}
    <View style={styles.between}>
      <View style={{ flex: 1, gap: 4 }}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  </View>;
}

export function Banner({ tone = 'info', icon, title, children, action }: { tone?: Tone; icon?: IconName; title?: string; children?: ReactNode; action?: ReactNode }) {
  const color = tones[tone];
  const fallback: IconName = tone === 'danger' ? 'alert-circle-outline' : tone === 'success' ? 'checkmark-circle-outline' : tone === 'warning' ? 'warning-outline' : 'information-circle-outline';
  return <View accessibilityRole={tone === 'danger' ? 'alert' : undefined} accessibilityLiveRegion="polite" style={[styles.banner, { backgroundColor: color.soft }]}>
    <Ionicons name={icon ?? fallback} size={20} color={color.ink} style={{ marginTop: 1 }} />
    <View style={{ flex: 1, gap: 5 }}>
      {title ? <Text style={{ color: color.ink, fontWeight: '700', fontSize: 14 }}>{title}</Text> : null}
      {typeof children === 'string' ? <Text style={{ color: color.ink, fontSize: 13, lineHeight: 19 }}>{children}</Text> : children}
      {action}
    </View>
  </View>;
}

export function Pill({ label, tone = 'neutral', icon }: { label: string; tone?: Tone; icon?: IconName }) {
  const color = tones[tone];
  return <View style={[styles.pill, { backgroundColor: color.soft }]}>
    {icon ? <Ionicons name={icon} size={12} color={color.ink} /> : null}
    <Text style={{ color: color.ink, fontSize: 12, fontWeight: '700' }}>{label}</Text>
  </View>;
}

export function IconTile({ icon, tone = 'primary', size = 42 }: { icon: IconName; tone?: Tone; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size * 0.33, backgroundColor: tones[tone].soft, alignItems: 'center', justifyContent: 'center' }}>
    <Ionicons name={icon} size={size * 0.52} color={tones[tone].ink} />
  </View>;
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: readonly { value: T; label: string }[]; onChange: (value: T) => void; label?: string }) {
  return <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.segmented}>
    {options.map(item => {
      const active = item.value === value;
      return <Pressable key={item.value} accessibilityRole="radio" aria-checked={active} onPress={() => onChange(item.value)} style={[styles.segment, active && styles.segmentActive]}>
        <Text style={{ fontSize: 13, fontWeight: '700', textAlign: 'center', color: active ? Colors.primaryText : Colors.textMuted }}>{item.label}</Text>
      </Pressable>;
    })}
  </View>;
}

export function Chip({ label, active, onPress, count, icon }: { label: string; active?: boolean; onPress: () => void; count?: number; icon?: IconName }) {
  return <Pressable accessibilityRole="button" aria-selected={active} onPress={onPress} style={[styles.chip, active && { backgroundColor: Colors.primary, borderColor: Colors.primary }]}>
    {icon ? <Ionicons name={icon} size={15} color={active ? Colors.white : Colors.textSecondary} /> : null}
    <Text style={{ fontSize: 13, fontWeight: '600', color: active ? Colors.white : Colors.textSecondary }}>{label}</Text>
    {count ? <Text style={{ fontSize: 12, fontWeight: '700', color: active ? Colors.white : Colors.primaryText }}>{count > 999 ? '999+' : count}</Text> : null}
  </Pressable>;
}

export function EmptyState({ icon, title, children, action }: { icon: IconName; title: string; children?: string; action?: ReactNode }) {
  return <View style={styles.empty}>
    <IconTile icon={icon} size={60} />
    <Text style={{ fontSize: 18, fontWeight: '700', textAlign: 'center' }}>{title}</Text>
    {children ? <Text style={[styles.subtitle, { textAlign: 'center', maxWidth: 360 }]}>{children}</Text> : null}
    {action}
  </View>;
}

export function Progress({ percent, tone = 'primary' }: { percent: number; tone?: Tone }) {
  return <View accessibilityRole="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(100, percent))} style={styles.track}>
    <View style={{ height: '100%', width: `${Math.max(0, Math.min(100, percent))}%`, borderRadius: 6, backgroundColor: tone === 'primary' ? Colors.brand : tones[tone].ink }} />
  </View>;
}

/** Ventana de la app: hoja inferior en el teléfono, diálogo centrado en escritorio. */
export function Sheet({ visible, title, onClose, children, footer }: { visible: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const wide = useWide();
  return <Modal visible={visible} transparent animationType={wide ? 'fade' : 'slide'} onRequestClose={onClose}>
    <View style={[styles.overlay, { justifyContent: wide ? 'center' : 'flex-end', padding: wide ? 24 : 0 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" style={StyleSheet.absoluteFill} onPress={onClose} />
      <View accessibilityViewIsModal style={[styles.sheet, wide ? { borderRadius: BorderRadius.xxl, maxWidth: 480 } : { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, paddingBottom: 30 }]}>
        <View style={styles.between}>
          <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: '700', flex: 1 }}>{title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar ventana" hitSlop={10} onPress={onClose}><Ionicons name="close" size={24} color={Colors.textSecondary} /></Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 14 }}>{children}</ScrollView>
        {footer}
      </View>
    </View>
  </Modal>;
}

export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.background },
  content: { width: '100%', maxWidth: 1160, alignSelf: 'center', padding: 18, paddingBottom: 110, gap: 18 },
  narrow: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 18, paddingBottom: 60, gap: 18 },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.border, padding: 18, gap: 14, ...Shadows.card },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.7, color: Colors.text },
  eyebrow: { fontSize: 12, fontWeight: '700', color: Colors.primaryText },
  subtitle: { fontSize: 14, lineHeight: 21, color: Colors.textSecondary },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, letterSpacing: -0.2 },
  caption: { fontSize: 12, lineHeight: 18, color: Colors.textMuted },
  back: { flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start', paddingVertical: 4, marginLeft: -4 },
  banner: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: BorderRadius.lg },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.round },
  segmented: { flexDirection: 'row', backgroundColor: '#E7F0F0', borderRadius: BorderRadius.md, padding: 4, gap: 4, alignSelf: 'flex-start', maxWidth: '100%' },
  segment: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 9, flexShrink: 1 },
  segmentActive: { backgroundColor: Colors.surface, ...Shadows.card },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, paddingVertical: 9, borderRadius: BorderRadius.round, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 40, paddingHorizontal: 20 },
  track: { height: 10, borderRadius: 6, overflow: 'hidden', backgroundColor: '#E7F0F0' },
  overlay: { flex: 1, backgroundColor: Colors.overlay, alignItems: 'center' },
  sheet: { width: '100%', maxHeight: '88%', backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.xxl, borderTopRightRadius: BorderRadius.xxl, padding: 22, gap: 16, ...Shadows.raised },
});

export const isWeb = Platform.OS === 'web';
