import { ActivityIndicator, Pressable, Text } from 'react-native';

import styles from './Button.styles';
import { ButtonProps } from './Button.types';

export default function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
}: ButtonProps) {
  return (
    <Pressable
      style={[
        styles.button,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text style={styles.text}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}