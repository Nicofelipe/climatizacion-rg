import { ActivityIndicator, Pressable, Text } from 'react-native';

import styles from './Button.styles';
import { ButtonProps } from './Button.types';

export default function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  selected = false,
  variant = 'primary',
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{disabled:disabled||loading,selected,busy:loading}}
      style={({pressed})=>[
        styles.button,
        variant !== 'primary' && {backgroundColor:'#FFFFFF',borderColor:'#DCE6E8'},
        selected && {backgroundColor:'#E2F5EE',borderColor:'#0F8277'},
        pressed && {backgroundColor:variant==='primary'?'#0A655D':'#EDF6F3',transform:[{scale:0.985}]},
        (disabled || loading) && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={variant==='primary'?'white':'#0F8277'} />
      ) : (
        <Text style={[styles.text,variant!=='primary'&&{color:'#475569'},selected&&{color:'#0A655D',fontWeight:'700'}]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
