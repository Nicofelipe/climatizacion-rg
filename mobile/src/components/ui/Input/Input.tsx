import { Pressable, Text, TextInput, View } from 'react-native';
import {useState} from 'react';
import {Ionicons} from '@expo/vector-icons';
import {Colors} from '@/theme';

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
  const [visible,setVisible]=useState(false);
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
      </Text>

      <View style={{flexDirection:'row',alignItems:'center'}}><TextInput
        accessibilityLabel={label}
        style={[styles.input,{flex:1,color:Colors.text,paddingRight:secureTextEntry?52:16}]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={Boolean(secureTextEntry)&&!visible}
        autoCapitalize={secureTextEntry||keyboardType==='email-address'?'none':'sentences'}
        autoCorrect={secureTextEntry||keyboardType==='email-address'?false:undefined}
        autoComplete={secureTextEntry?'current-password':keyboardType==='email-address'?'email':undefined}
        textContentType={secureTextEntry?'password':keyboardType==='email-address'?'emailAddress':undefined}
        placeholderTextColor={Colors.textSecondary}
        keyboardType={keyboardType}
      />{secureTextEntry?<Pressable accessibilityRole="button" accessibilityLabel={visible?'Ocultar contraseña':'Mostrar contraseña'} onPress={()=>setVisible(value=>!value)} style={{position:'absolute',right:8,padding:10}}><Ionicons name={visible?'eye-off-outline':'eye-outline'} size={22} color={Colors.primary}/></Pressable>:null}</View>

      {!!error && (
        <Text style={styles.error}>
          {error}
        </Text>
      )}
    </View>
  );
}
