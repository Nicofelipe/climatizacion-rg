import {useCallback,useEffect,useRef,useState} from 'react';
import {AppState,Modal,Platform,Pressable,Text,View,ActivityIndicator} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {useAuth} from '@/hooks/useAuth';
import {usePushRegistration} from '@/hooks/usePushRegistration';
import {requestJson} from '@/api/http';
import {onDataRefresh,notifyDataRefresh} from '@/utils/refreshEvents';
import {Colors} from '@/theme';
import FormScrollView from './FormScrollView';
interface Notice{Id:number;ExpenseId:number;Kind:string;title:string;body:string;ReadAt:string|null;CreatedAt:string}
export default function NotificationCenter(){
 const {token}=useAuth();const[items,setItems]=useState<Notice[]>([]),[count,setCount]=useState(0),[visible,setVisible]=useState(false),[notice,setNotice]=useState<Notice|null>(null),[error,setError]=useState('');
 const known=useRef<Set<number>>(new Set());
 const load=useCallback(async()=>{if(!token)return;const result=await requestJson(`${process.env.EXPO_PUBLIC_API_URL}/notifications`,{headers:{Authorization:`Bearer ${token}`}});return result as {notifications:Notice[];unreadCount:number};},[token]);
 useEffect(()=>{
  let alive=true,busy=false;known.current=new Set();setItems([]);setCount(0);setNotice(null);
  const refresh=async()=>{if(!alive||busy||AppState.currentState==='background'||AppState.currentState==='inactive')return;busy=true;
   try{const result=await load();if(!alive||!result)return;setError('');setItems(result.notifications);setCount(result.unreadCount);
    const added=result.notifications.find(item=>!item.ReadAt&&!known.current.has(item.Id));if(added)setNotice(added);
    known.current=new Set(result.notifications.map(item=>item.Id));
    setNotice(current=>current&&result.notifications.some(item=>item.Id===current.Id&&!item.ReadAt)?current:null);
   }catch{if(alive)setError('No fue posible actualizar los notificaciones.');}finally{busy=false;}
  };void refresh();const timer=setInterval(refresh,30000);const unsubscribe=onDataRefresh(()=>{void refresh();});const app=AppState.addEventListener('change',state=>{if(state==='active')void refresh();});
  return()=>{alive=false;clearInterval(timer);unsubscribe();app.remove();};
 },[load]);
 const openNotice=useCallback(async(id:number)=>{
  if(!token)return;
  try{const result=await requestJson(`${process.env.EXPO_PUBLIC_API_URL}/notifications/${id}/read`,{method:'POST',headers:{Authorization:`Bearer ${token}`}});
   setVisible(false);setNotice(null);notifyDataRefresh();const expenseId=Number(result.notification.ExpenseId);
   if(Number.isSafeInteger(expenseId)&&expenseId>0)router.push({pathname:'/(protected)/expenses/[id]',params:{id:String(expenseId)}});
  }catch{setError('Este aviso ya no está disponible para tu cuenta.');setVisible(true);}
 },[token]);
 const push=usePushRegistration(token,id=>{void openNotice(id);});
 return <>
  <View style={{alignItems:'flex-end',paddingHorizontal:16,paddingVertical:5,backgroundColor:Colors.background}}><Pressable accessibilityRole="button" accessibilityLabel={`Notificaciones, ${count} sin leer`} onPress={()=>setVisible(true)} style={{flexDirection:'row',alignItems:'center',gap:7,padding:6}}><Ionicons name="notifications-outline" size={21} color={Colors.primary}/><Text style={{fontSize:12,color:Colors.primary,fontWeight:'700'}}>Notificaciones</Text>{count>0?<View style={{backgroundColor:'#DC2626',borderRadius:12,paddingHorizontal:6,paddingVertical:2}}><Text style={{fontSize:10,color:'white',fontWeight:'700'}}>{count>99?'99+':count}</Text></View>:null}</Pressable></View>
  {notice?<View accessibilityLiveRegion="polite" style={{backgroundColor:notice.Kind==='REJECTED'?'#FEF2F2':'#E5F5EF',padding:12,flexDirection:'row',gap:12,alignItems:'center'}}><Pressable accessibilityRole="button" onPress={()=>{void openNotice(notice.Id);}} style={{flex:1,gap:4}}><Text style={{color:Colors.text,fontWeight:'700',fontSize:13}}>{notice.title}</Text><Text style={{color:Colors.textSecondary,fontSize:12}}>{notice.body}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Cerrar aviso" onPress={()=>setNotice(null)}><Ionicons name="close" size={20} color={Colors.text}/></Pressable></View>:null}
  <Modal visible={visible} animationType="slide" onRequestClose={()=>setVisible(false)}><SafeAreaView style={{flex:1,backgroundColor:Colors.background}}><View style={{padding:20,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Text style={{fontSize:25,fontWeight:'700',color:Colors.text}}>Mis notificaciones</Text><Pressable accessibilityRole="button" accessibilityLabel="Cerrar notificaciones" onPress={()=>setVisible(false)}><Ionicons name="close" size={26} color={Colors.text}/></Pressable></View>
   <FormScrollView contentContainerStyle={{padding:20,gap:14}}>{error?<Text accessibilityRole="alert" style={{color:Colors.danger}}>{error}</Text>:null}
    {Platform.OS!=='web'?<View style={{padding:16,borderRadius:16,backgroundColor:'white',gap:10}}><Text style={{color:Colors.text,fontWeight:'700'}}>Notificaciones en el teléfono</Text><Text style={{color:Colors.textSecondary,fontSize:12}}>{push.message}</Text>{!['ready','server-pending','unavailable'].includes(push.status)?<Pressable accessibilityRole="button" disabled={push.status==='loading'} onPress={()=>{void push.enable();}}>{push.status==='loading'?<ActivityIndicator color={Colors.primary}/>:<Text style={{color:Colors.primary,fontWeight:'700'}}>{push.status==='denied'?'Permitir notificaciones en Ajustes':'Activar notificaciones'}</Text>}</Pressable>:null}</View>:null}
    {!items.length?<Text style={{color:Colors.textSecondary}}>Todavía no tienes notificaciones.</Text>:items.map(item=><Pressable key={item.Id} accessibilityRole="button" onPress={()=>{void openNotice(item.Id);}} style={{padding:18,gap:7,borderRadius:16,backgroundColor:'white',borderWidth:1,borderColor:item.ReadAt?Colors.border:Colors.primary}}><Text style={{color:Colors.text,fontWeight:'700'}}>{item.title}{!item.ReadAt?' · Nuevo':''}</Text><Text style={{fontSize:13,lineHeight:20,color:Colors.textSecondary}}>{item.body}</Text><Text style={{fontSize:11,color:Colors.textSecondary}}>{new Date(item.CreatedAt).toLocaleString('es-CL')}</Text></Pressable>)}
   </FormScrollView></SafeAreaView></Modal>
 </>;
}
