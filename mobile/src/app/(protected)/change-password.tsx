import FormScrollView from '@/components/common/FormScrollView';
import { useState } from 'react';
import { router } from 'expo-router';
import { ScrollView,Text,View } from 'react-native';
import AppContainer from '@/components/layout/AppContainer';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { requestJson } from '@/api/http';
import { Colors } from '@/theme';
import { validNewPassword,passwordRequirementsMessage } from '@/utils/passwordRequirements';
import ErrorBanner from '@/components/common/ErrorBanner';
export default function ChangePassword(){
  const {token,replaceSession,logout}=useAuth();
  const [current,setCurrent]=useState(''),[next,setNext]=useState(''),[confirm,setConfirm]=useState('');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false);
  async function save(){if(busy||!token)return;setError('');
    if(!current){setError('Ingresa tu contraseña actual.');return;}
    if(!validNewPassword(next)){setError(passwordRequirementsMessage);return;}
    if(next!==confirm){setError('Las contraseñas no coinciden. Revisa la confirmación.');return;}
    setBusy(true);try{const result=await requestJson(`${process.env.EXPO_PUBLIC_API_URL}/auth/password/change`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({currentPassword:current,newPassword:next})});replaceSession(result);setCurrent('');setNext('');setConfirm('');setDone(true);}
    catch(err){setError(err instanceof Error?err.message:'No fue posible cambiar la contraseña.');}finally{setBusy(false);}}
  return <AppContainer><FormScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{width:'100%',maxWidth:480,alignSelf:'center',paddingBottom:30,gap:18}}><Text style={{fontSize:27,fontWeight:'700',color:Colors.text}}>Cambiar contraseña</Text>
    {done?<><Text accessibilityRole="alert" style={{color:Colors.primary}}>Tu contraseña se actualizó. Las sesiones anteriores ya no tienen acceso.</Text><Button title="Continuar" onPress={()=>router.replace('/(protected)/(tabs)/profile')}/></>:<View style={{padding:20,borderRadius:20,backgroundColor:'white',gap:16}}>
      <Text style={{color:Colors.textSecondary,lineHeight:21}}>Si es tu primer cambio, usa como contraseña actual la que te entregó el administrador. El plazo no se reinicia al cerrar sesión.</Text>
      <Input label="Contraseña actual" value={current} onChangeText={setCurrent} secureTextEntry/>
      <Input label="Nueva contraseña (mínimo 8 caracteres)" value={next} onChangeText={value=>{setNext(value);setError('');}} secureTextEntry/>
      <Text style={{color:Colors.textSecondary,fontSize:12,lineHeight:19}}>{passwordRequirementsMessage}</Text>
      <Input label="Repite la nueva contraseña" value={confirm} onChangeText={value=>{setConfirm(value);setError('');}} secureTextEntry/>
      {confirm&&next!==confirm?<ErrorBanner message="Las contraseñas no coinciden. Revisa la confirmación."/>:error?<ErrorBanner message={error}/>:null}
      <Button title="Guardar nueva contraseña" loading={busy} onPress={save}/><Button title="Cerrar sesión" disabled={busy} onPress={logout}/>
    </View>}
  </FormScrollView></AppContainer>;
}
