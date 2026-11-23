import { StyleSheet, Text as NativeText, TextInput as NativeTextInput, TextInputProps, TextProps } from 'react-native';
import { Colors } from '@/theme';
import { fontFor } from '@/theme/typography';

/** Texto de la app: elige el archivo de fuente según el peso y tamaño del estilo. */
export default function Text({ style, ...props }: TextProps) {
  const { fontWeight, ...flat } = StyleSheet.flatten(style) ?? {};
  return <NativeText {...props} style={[{ color: Colors.text, fontSize: 15 }, flat, { fontFamily: flat.fontFamily ?? fontFor(fontWeight, flat.fontSize ?? 15) }]} />;
}

export function TextInput({ style, ...props }: TextInputProps) {
  const { fontWeight, ...flat } = StyleSheet.flatten(style) ?? {};
  return <NativeTextInput placeholderTextColor={Colors.placeholder} {...props} style={[flat, { fontFamily: fontFor(fontWeight, 15) }]} />;
}
