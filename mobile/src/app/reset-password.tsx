import FormScrollView from '@/components/common/FormScrollView';
import { useEffect,useState } from 'react';
import { router } from 'expo-router';
import { Linking,Platform,ScrollView,Text,View } from 'react-native';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import ErrorBanner from '@/components/common/ErrorBanner';
import { requestJson } from '@/api/http';
import { validNewPassword,passwordRequirementsMessage } from '@/utils/passwordRequirements';
import { Colors } from '@/theme';
import { useAuth } from '@/hooks/useAuth';
export default function ResetPassword(){
  const {logout}=useAuth();
  const [token,setToken]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[error,setError]=useState(''),[done,setDone]=useState(false),[busy,setBusy]=useState(false);
  useEffect(()=>{let active=true;async function read(){const url=Platform.OS==='web'?window.location.href:await Linking.getInitialURL();const value=new URLSearchParams(url?.split('#')[1]??'').get('token')??'';if(active)setToken(value);if(Platform.OS==='web')window.history.replaceState(null,'',window.location.pathname);}void read();return()=>{active=false;};},[]);
  async function save(){if(busy)return;setError('');if(!validNewPassword(password)){setError(passwordRequirementsMessage);return;}if(password!==confirm){setError('Las contraseñas no coinciden. Revisa la confirmación.');return;}
    setBusy(true);try{await requestJson(`${process.env.EXPO_PUBLIC_API_URL}/auth/recovery/reset`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,password})});setToken('');setPassword('');setConfirm('');setDone(true);logout();}catch(err){setError(err instanceof Error?err.message:'No fue posible restablecer la contraseña.');}finally{setBusy(false);}}
  return <FormScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{flexGrow:1,justifyContent:'center',padding:22,backgroundColor:Colors.background}}><View style={{width:'100%',maxWidth:440,alignSelf:'center',padding:22,borderRadius:22,backgroundColor:'white',gap:17}}><Text style={{fontSize:26,fontWeight:'700',color:Colors.text}}>Nueva contraseña</Text>
    {done?<Text accessibilityRole="alert" style={{color:Colors.primary,lineHeight:21}}>Tu contraseña se actualizó y las sesiones anteriores se cerraron. Ingresa con tu nueva contraseña.</Text>:!token?<ErrorBanner message="Abre el enlace de recuperación recibido en tu correo. Si venció, solicita uno nuevo."/>:<><Text style={{color:Colors.textSecondary,lineHeight:20}}>{passwordRequirementsMessage}</Text><Input label="Nueva contraseña" value={password} onChangeText={value=>{setPassword(value);setError('');}} secureTextEntry/><Input label="Repite la nueva contraseña" value={confirm} onChangeText={value=>{setConfirm(value);setError('');}} secureTextEntry/>{confirm&&password!==confirm?<ErrorBanner message="Las contraseñas no coinciden. Revisa la confirmación."/>:error?<ErrorBanner message={error}/>:null}<Button title="Guardar nueva contraseña" loading={busy} onPress={save}/></>}
    <Button title="Ir al inicio de sesión" disabled={busy} onPress={()=>router.replace('/(auth)/login')}/>
  </View></FormScrollView>;
}
