import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import { BorderRadius, Colors, Shadows } from '@/theme';
import { ButtonProps } from './Button.types';

const palette = {
  primary: { background: Colors.primary, pressed: Colors.primaryDark, border: Colors.primary, text: Colors.white },
  secondary: { background: Colors.surface, pressed: Colors.primarySofter, border: Colors.borderStrong, text: Colors.primaryText },
  choice: { background: Colors.surface, pressed: Colors.primarySofter, border: Colors.border, text: Colors.textSecondary },
  ghost: { background: 'transparent', pressed: Colors.primarySofter, border: 'transparent', text: Colors.primaryText },
  danger: { background: Colors.dangerSoft, pressed: '#FACFD0', border: '#F3C6C9', text: Colors.danger },
  success: { background: Colors.success, pressed: '#1C5F39', border: Colors.success, text: Colors.white },
} as const;

export default function Button({ title, onPress, icon, loading = false, disabled = false, selected = false, variant = 'primary', compact = false, style }: ButtonProps) {
  const colors = selected ? { background: Colors.primarySoft, pressed: Colors.primarySoft, border: Colors.primary, text: Colors.primaryText } : palette[variant];
  const blocked = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={title} aria-disabled={blocked} aria-selected={selected} aria-busy={loading}
      onPress={onPress} disabled={blocked}
      style={({ pressed }) => [
        styles.button, compact && styles.compact, { backgroundColor: pressed ? colors.pressed : colors.background, borderColor: colors.border },
        variant === 'primary' && !selected && !blocked && Shadows.primary, pressed && { transform: [{ scale: 0.985 }] }, blocked && { opacity: 0.55 }, style,
      ]}
    >
      {loading ? <ActivityIndicator color={colors.text} /> : <>
        {icon ? <Ionicons name={icon} size={compact ? 16 : 19} color={colors.text} /> : null}
        <Text style={{ color: colors.text, fontSize: compact ? 13 : 15, fontWeight: '700', textAlign: 'center', flexShrink: 1 }}>{title}</Text>
      </>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 50, paddingVertical: 13, paddingHorizontal: 18, borderWidth: 1, borderRadius: BorderRadius.control, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  compact: { minHeight: 40, paddingVertical: 8, paddingHorizontal: 13, borderRadius: BorderRadius.md },
});
