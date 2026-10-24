import {router} from 'expo-router';
import {Pressable,Text,View} from 'react-native';
import AppContainer from '@/components/layout/AppContainer';
import FormScrollView from '@/components/common/FormScrollView';
import ReceiptEntryOptions from '@/components/common/ReceiptEntryOptions';
import {Colors} from '@/theme';

export default function NewReceipt(){
 return <AppContainer><FormScrollView contentContainerStyle={{paddingBottom:36,gap:14}}>
  <Pressable accessibilityRole="button" onPress={()=>router.back()}><Text style={{color:Colors.primary}}>← Volver</Text></Pressable>
  <View style={{gap:8}}><Text style={{fontSize:27,fontWeight:'800',color:Colors.text}}>Registrar boleta</Text><Text style={{fontSize:14,lineHeight:21,color:Colors.textSecondary}}>Elige cómo comenzar. En ambos casos revisarás los datos antes de guardar.</Text></View>
  <ReceiptEntryOptions replace/>
  <Text style={{fontSize:12,lineHeight:19,color:Colors.textSecondary}}>Tu boleta siempre debe incluir una foto. El escaneo es una ayuda: puedes corregir los datos antes de enviarlos.</Text>
 </FormScrollView></AppContainer>;
}
