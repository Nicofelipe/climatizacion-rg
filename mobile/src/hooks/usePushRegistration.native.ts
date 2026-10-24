import {useCallback,useEffect,useRef,useState} from 'react';
import {AppState,Platform,Linking} from 'react-native';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as Notifications from 'expo-notifications';
import {requestJson} from '@/api/http';
import {notifyDataRefresh} from '@/utils/refreshEvents';
Notifications.setNotificationHandler({handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:true,shouldSetBadge:false})});
const deviceRequest=(token:string,action:string,data:unknown)=>requestJson(`${process.env.EXPO_PUBLIC_API_URL}/notifications/devices/${action}`,{
 method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(data)});
export function usePushRegistration(token:string|null,onOpen:(id:number)=>void){
 const [status,setStatus]=useState('disabled'),[message,setMessage]=useState('Activa los notificaciones para recibir novedades con la aplicación cerrada.');
 const binding=useRef<{token:string;registrationId:string}|null>(null),epoch=useRef(0),open=useRef(onOpen);open.current=onOpen;
 const registering=useRef(false),lastRegistration=useRef(0);
 const register=useCallback(async(ask:boolean)=>{
  if(!token)return;
  if(Platform.OS!=='android'||!Constants.expoConfig?.extra?.nativePushEnabled){setStatus('unavailable');setMessage('Esta instalación todavía no incluye la configuración para notificaciones del teléfono. Las notificaciones dentro de la aplicación siguen disponibles.');return;}
  if(registering.current||(!ask&&Date.now()-lastRegistration.current<60000))return;
  registering.current=true;lastRegistration.current=Date.now();
  setStatus('loading');setMessage(ask?'Comprobando el permiso del teléfono…':'Comprobando notificaciones…');
  const attempt=epoch.current;
  try{
   await Notifications.setNotificationChannelAsync('rendiciones',{name:'Rendiciones',importance:Notifications.AndroidImportance.HIGH,lockscreenVisibility:Notifications.AndroidNotificationVisibility.PRIVATE});
   let permission=await Notifications.getPermissionsAsync();
   if(!permission.granted&&ask&&!permission.canAskAgain){setStatus('denied');setMessage('El permiso está bloqueado. En Ajustes → Notificaciones, permite las notificaciones de esta aplicación.');await Linking.openSettings();return;}
   if(!permission.granted&&ask)permission=await Notifications.requestPermissionsAsync();
   if(!permission.granted){setStatus('denied');setMessage('Los notificaciones del teléfono no están autorizados. Puedes habilitarlos en Ajustes de Android.');return;}
   setStatus('loading');
   let timer:ReturnType<typeof setTimeout>|undefined;
   const native=await Promise.race([Notifications.getDevicePushTokenAsync(),new Promise<never>((_resolve,reject)=>{timer=setTimeout(()=>reject(new Error('TOKEN_TIMEOUT')),15000);})]).finally(()=>clearTimeout(timer));if(typeof native.data!=='string')throw new Error('NO_DEVICE_TOKEN');
   const next={token:native.data,registrationId:Crypto.randomUUID()};
   const result=await deviceRequest(token,'register',next);
   if(epoch.current!==attempt){await deviceRequest(token,'unregister',next).catch(()=>{});return;}
   binding.current=next;
   setStatus(result.pushAvailable?'ready':'server-pending');setMessage(result.pushAvailable?'Notificaciones del teléfono activadas.':'Permiso concedido y teléfono registrado. Falta habilitar Firebase en el servidor para recibir notificaciones con la aplicación cerrada. Las notificaciones dentro de la app ya están disponibles.');
  }catch{if(epoch.current===attempt){setStatus('error');setMessage('No fue posible activar los notificaciones. Revisa tu conexión y vuelve a intentar.');}}
  finally{if(epoch.current===attempt)registering.current=false;}
 },[token]);
 useEffect(()=>{
  epoch.current++;registering.current=false;lastRegistration.current=0;void register(false);
  const handle=(response:Notifications.NotificationResponse)=>{const id=Number(response.notification.request.content.data?.notificationId);if(Number.isSafeInteger(id)&&id>0)open.current(id);};
  const response=Notifications.addNotificationResponseReceivedListener(handle);
  const received=Notifications.addNotificationReceivedListener(()=>notifyDataRefresh());
  const foreground=AppState.addEventListener('change',state=>{if(state==='active')void register(false);});
  let alive=true;
  void Notifications.getLastNotificationResponseAsync().then(value=>{if(alive&&value){handle(value);void Notifications.clearLastNotificationResponseAsync();}}).catch(()=>{});
  return()=>{alive=false;epoch.current++;response.remove();received.remove();foreground.remove();
   const current=binding.current;binding.current=null;if(token&&current)void deviceRequest(token,'unregister',current).catch(()=>{});
   void Notifications.dismissAllNotificationsAsync().catch(()=>{});
  };
 },[token,register]);
 return {status,message,enable:()=>register(true)};
}
