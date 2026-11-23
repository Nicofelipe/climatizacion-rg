import type { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import type { TextInputProps } from 'react-native';

export interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'number-pad' | 'phone-pad';
  error?: string;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  prefix?: string;
  /** Se muestra junto a la etiqueta, por ejemplo el estado de la lectura. */
  badge?: ReactNode;
  multiline?: boolean;
  maxLength?: number;
  autoComplete?: TextInputProps['autoComplete'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  onBlur?: () => void;
  onSubmitEditing?: () => void;
}
