import { useEffect,useState } from 'react';
import { router,usePathname } from 'expo-router';
import { AppState,Pressable,Text,View } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { requestJson } from '@/api/http';

export default function PasswordReminder(){
  const {user,token}=useAuth();const path=usePathname();
  const [policy,setPolicy]=useState(user?.passwordPolicy);
  const [now,setNow]=useState(Date.now());
  const [syncedAt,setSyncedAt]=useState(Date.now());
  const [checkFailed,setCheckFailed]=useState(false);
  useEffect(()=>{setPolicy(user?.passwordPolicy);setCheckFailed(false);setSyncedAt(Date.now());setNow(Date.now());},[user,token]);
  useEffect(()=>{let active=true;
    async function load(){if(!token)return;try{const result=await requestJson(`${process.env.EXPO_PUBLIC_API_URL}/auth/password/status`,{headers:{Authorization:`Bearer ${token}`}});if(active){setPolicy(result);setNow(Date.now());setSyncedAt(Date.now());setCheckFailed(false);}}catch{if(active)setCheckFailed(true);}}
    void load();const timer=setInterval(()=>{setNow(Date.now());void load();},60000);
    const subscription=AppState.addEventListener('change',state=>{if(state==='active')void load();});
    return()=>{active=false;clearInterval(timer);subscription.remove();};
  },[token,path]);
  const seconds=policy?.remainingSeconds!=null?Math.max(0,Math.ceil(policy.remainingSeconds-(now-syncedAt)/1000)):null;
  const expired=Boolean(policy?.mustChangePassword&&(policy.expired||seconds===0));
  useEffect(()=>{if(expired&&path!=='/change-password')router.replace('/(protected)/change-password');},[expired,path]);
  if(!policy?.mustChangePassword||path==='/change-password')return null;
  return <View accessibilityLiveRegion="polite" style={{backgroundColor:'#FFF1D9',padding:14,gap:7}}><Text style={{color:'#7B4A12',fontWeight:'700',fontSize:13}}>Cambia tu contraseña inicial</Text><Text style={{color:'#7B4A12',fontSize:12,lineHeight:18}}>{seconds===null?'Tu plazo de cambio empieza en el primer acceso.':`Te quedan ${Math.floor(seconds/3600)} h ${Math.floor(seconds%3600/60)} min. Al vencer, el acceso a tus datos quedará restringido hasta cambiarla.`}</Text>{checkFailed?<Text style={{fontSize:11,color:'#7B4A12'}}>No pudimos comprobar el plazo con el servidor. Se muestra el último plazo conocido.</Text>:null}<Pressable accessibilityRole="button" onPress={()=>router.push('/(protected)/change-password')}><Text style={{color:'#7B4A12',fontWeight:'700',fontSize:12}}>Cambiar contraseña ahora →</Text></Pressable></View>;
}
