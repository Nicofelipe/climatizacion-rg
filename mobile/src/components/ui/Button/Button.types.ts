import { GestureResponderEvent } from 'react-native';

export interface ButtonProps {
  title: string;
  onPress: (event: GestureResponderEvent) => void;

  loading?: boolean;
  disabled?: boolean;
}