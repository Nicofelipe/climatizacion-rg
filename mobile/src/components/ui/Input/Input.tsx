import { Text, TextInput, View } from 'react-native';

import styles from './Input.styles';
import { InputProps } from './Input.types';

export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  error,
}: InputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
      </Text>

      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
      />

      {!!error && (
        <Text style={styles.error}>
          {error}
        </Text>
      )}
    </View>
  );
}