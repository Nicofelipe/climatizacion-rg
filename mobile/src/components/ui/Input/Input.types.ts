export interface InputProps {
  label: string;

  value: string;

  onChangeText: (text: string) => void;

  placeholder?: string;

  secureTextEntry?: boolean;

  keyboardType?:
    | 'default'
    | 'email-address'
    | 'numeric';

  error?: string;
}