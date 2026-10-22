import { useEffect,useState } from 'react';
import { router } from 'expo-router';
import { ScrollView,Text, View } from 'react-native';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import ErrorBanner from '@/components/common/ErrorBanner';
import { requestJson } from '@/api/http';
import { Colors } from '@/theme';

export default function ForgotPasswordScreen() {
  const [email,setEmail]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const [available,setAvailable]=useState<boolean|null>(null);
  useEffect(()=>{let active=true;requestJson(`${process.env.EXPO_PUBLIC_API_URL}/auth/recovery/status`).then(result=>{if(active)setAvailable(result.available);}).catch(()=>{});return()=>{active=false;};},[]);
  async function request(){if(busy)return;setError('');setMessage('');if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())){setError('Ingresa un correo válido.');return;}
    setBusy(true);try{const result=await requestJson(`${process.env.EXPO_PUBLIC_API_URL}/auth/recovery/request`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email.trim().toLowerCase()})});setMessage(result.message);}catch(err){setError(err instanceof Error?err.message:'No fue posible solicitar el enlace.');}finally{setBusy(false);}}
  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{flexGrow:1,justifyContent:'center',padding:22,backgroundColor:Colors.background}}><View style={{width:'100%',maxWidth:440,alignSelf:'center',padding:22,borderRadius:22,backgroundColor:'white',gap:18}}>
      <Text style={{fontSize:26,fontWeight:'700',color:Colors.text}}>Recuperar contraseña</Text><Text style={{color:Colors.textSecondary,lineHeight:21}}>Indica el correo registrado en tu empresa. Recibirás un enlace temporal para elegir una contraseña nueva, tanto si eres trabajador como supervisor.</Text>
      <Input label="Correo registrado" value={email} onChangeText={setEmail} keyboardType="email-address"/>
      {available===false?<ErrorBanner message="La recuperación por correo todavía no está disponible. Contacta al responsable de tu empresa."/>:null}
      {error?<ErrorBanner message={error}/>:null}{message?<Text accessibilityRole="alert" style={{color:Colors.primary,lineHeight:21}}>{message}</Text>:null}
      <Button title="Enviar enlace de recuperación" disabled={available===false} loading={busy} onPress={request}/><Button title="Volver al inicio de sesión" disabled={busy} onPress={()=>router.replace('/(auth)/login')}/>
    </View></ScrollView>
  );
}
