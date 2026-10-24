import { ActivityIndicator, Pressable, Text } from 'react-native';

import styles from './Button.styles';
import { ButtonProps } from './Button.types';

export default function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  selected = false,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{disabled:disabled||loading,selected,busy:loading}}
      style={({pressed})=>[
        styles.button,
        selected && {backgroundColor:'#17233D',borderWidth:2,borderColor:'#53D5B5'},
        pressed && {backgroundColor:'#075E54',transform:[{scale:0.98}]},
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
