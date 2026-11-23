import type { Ionicons } from '@expo/vector-icons';
import type { GestureResponderEvent, StyleProp, ViewStyle } from 'react-native';

export interface ButtonProps {
  title: string;
  onPress: (event: GestureResponderEvent) => void;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  selected?: boolean;
  compact?: boolean;
  variant?: 'primary' | 'secondary' | 'choice' | 'ghost' | 'danger' | 'success';
  style?: StyleProp<ViewStyle>;
}
