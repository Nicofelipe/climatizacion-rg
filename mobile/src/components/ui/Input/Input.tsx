import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Text, { TextInput } from '@/components/ui/Text';
import { BorderRadius, Colors } from '@/theme';
import { InputProps } from './Input.types';

export default function Input({
  label, value, onChangeText, placeholder, secureTextEntry, keyboardType = 'default', error, hint, icon, badge, multiline, maxLength, autoComplete, onBlur, onSubmitEditing, autoCapitalize, prefix,
}: InputProps) {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const email = keyboardType === 'email-address';
  return (
    <View style={{ gap: 7 }}>
      {label || badge ? <View style={styles.labelRow}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        {badge}
      </View> : null}
      <View style={[styles.box, { borderColor: error ? Colors.danger : focused ? Colors.primary : Colors.border, backgroundColor: focused ? Colors.primarySofter : Colors.surface }]}>
        {icon ? <Ionicons name={icon} size={19} color={focused ? Colors.primary : Colors.textMuted} /> : null}
        {prefix ? <Text style={{ color: Colors.textMuted, fontWeight: '600' }}>{prefix}</Text> : null}
        <TextInput
          accessibilityLabel={label || placeholder} style={[styles.input, multiline && { minHeight: 76, textAlignVertical: 'top' }]}
          onFocus={() => setFocused(true)} onBlur={() => { setFocused(false); onBlur?.(); }}
          value={value} onChangeText={onChangeText} placeholder={placeholder} multiline={multiline} maxLength={maxLength} onSubmitEditing={onSubmitEditing}
          secureTextEntry={Boolean(secureTextEntry) && !visible} keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? (secureTextEntry || email ? 'none' : 'sentences')}
          autoCorrect={secureTextEntry || email ? false : undefined}
          autoComplete={autoComplete ?? (secureTextEntry ? 'current-password' : email ? 'email' : undefined)}
          textContentType={secureTextEntry ? 'password' : email ? 'emailAddress' : undefined}
        />
        {secureTextEntry ? <Pressable accessibilityRole="button" accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} hitSlop={8} onPress={() => setVisible(current => !current)}>
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={21} color={Colors.primary} />
        </Pressable> : null}
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 20 },
  label: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600', flexShrink: 1 },
  box: { flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderRadius: BorderRadius.control, paddingHorizontal: 14, minHeight: 50 },
  // Sin el marco propio del navegador: el foco se marca en la caja.
  input: { flex: 1, minWidth: 0, fontSize: 16, color: Colors.text, paddingVertical: 12, outlineWidth: 0 },
  error: { color: Colors.danger, fontSize: 12, lineHeight: 17 },
  hint: { color: Colors.textMuted, fontSize: 12, lineHeight: 17 },
});
