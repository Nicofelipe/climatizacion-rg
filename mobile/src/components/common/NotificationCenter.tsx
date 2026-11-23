import {useCallback,useEffect,useRef,useState} from 'react';
import { AccessibilityInfo, Animated, AppState, Platform, Pressable, StyleSheet, View } from 'react-native';
import Text from '@/components/ui/Text';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {useAuth} from '@/hooks/useAuth';
import {usePushRegistration} from '@/hooks/usePushRegistration';
import { API_URL, requestJson } from '@/api/http';
import {onDataRefresh,notifyDataRefresh} from '@/utils/refreshEvents';
import { BorderRadius, Colors, Shadows } from '@/theme';
import Button from '@/components/ui/Button';
import { Banner, EmptyState, IconTile, Sheet, styles as kit, useWide } from '@/components/ui/kit';
import ClepitBrand from './ClepitBrand';
import { dateTime } from '@/utils/dates';
interface Notice{Id:number;ExpenseId:number;Kind:string;title:string;body:string;ReadAt:string|null;CreatedAt:string}
export default function NotificationCenter(){
 const {token,user}=useAuth();const[items,setItems]=useState<Notice[]>([]),[count,setCount]=useState(0),[visible,setVisible]=useState(false),[notice,setNotice]=useState<Notice|null>(null),[error,setError]=useState('');
 const rotation=useRef(new Animated.Value(0)).current;
 const previousCount=useRef(0);
 useEffect(()=>{let active=true;const added=count>previousCount.current;previousCount.current=count;rotation.setValue(0);if(added)void AccessibilityInfo.isReduceMotionEnabled().then(reduced=>{if(!active||reduced)return;Animated.sequence([1,-1,1,-1,0].map(toValue=>Animated.timing(rotation,{toValue,duration:100,useNativeDriver:true}))).start();}).catch(()=>{});return()=>{active=false;rotation.stopAnimation();};},[count,rotation]);
 const known=useRef<Set<number>>(new Set());
 const load=useCallback(async()=>{if(!token)return;const result=await requestJson(`${API_URL}/notifications`,{headers:{Authorization:`Bearer ${token}`}});return result as {notifications:Notice[];unreadCount:number};},[token]);
 useEffect(()=>{
  let alive=true,busy=false;known.current=new Set();setItems([]);setCount(0);setNotice(null);
  const refresh=async()=>{if(!alive||busy||AppState.currentState==='background'||AppState.currentState==='inactive')return;busy=true;
   try{const result=await load();if(!alive||!result)return;setError('');setItems(result.notifications);setCount(result.unreadCount);
    const added=result.notifications.find(item=>!item.ReadAt&&!known.current.has(item.Id));if(added)setNotice(added);
    known.current=new Set(result.notifications.map(item=>item.Id));
    setNotice(current=>current&&result.notifications.some(item=>item.Id===current.Id&&!item.ReadAt)?current:null);
   }catch{if(alive)setError('No fue posible actualizar las notificaciones.');}finally{busy=false;}
  };void refresh();const timer=setInterval(refresh,30000);const unsubscribe=onDataRefresh(()=>{void refresh();});const app=AppState.addEventListener('change',state=>{if(state==='active')void refresh();});
  return()=>{alive=false;clearInterval(timer);unsubscribe();app.remove();};
 },[load]);
 const openNotice=useCallback(async(id:number)=>{
  if(!token)return;
  try{const result=await requestJson(`${API_URL}/notifications/${id}/read`,{method:'POST',headers:{Authorization:`Bearer ${token}`}});
   setVisible(false);setNotice(null);notifyDataRefresh();const expenseId=Number(result.notification.ExpenseId);
   if(Number.isSafeInteger(expenseId)&&expenseId>0)router.push({pathname:'/(protected)/expenses/[id]',params:{id:String(expenseId)}});
  }catch{setError('Este aviso ya no está disponible para tu cuenta.');setVisible(true);}
 },[token]);
 const [group,setGroup]=useState<string|null>(null);
 const push=usePushRegistration(token,id=>{if(id===0){setGroup(null);setVisible(true);}else void openNotice(id);});
 const wide = useWide();
 // El aviso flotante se retira solo; queda en la campana.
 useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(null), 8000); return () => clearTimeout(timer); }, [notice]);
 const sections = [
  { kind: 'PENDING_REVIEW', title: 'Por revisar', icon: 'hourglass-outline', tone: 'warning' },
  { kind: 'APPROVED', title: 'Aprobadas', icon: 'checkmark-circle-outline', tone: 'success' },
  { kind: 'REJECTED', title: 'Rechazadas', icon: 'close-circle-outline', tone: 'danger' },
 ] as const;
 const openPanel = () => { setGroup(null); setVisible(true); };
 return <>
  <View pointerEvents="box-none" style={[s.bar, wide && s.floating]}>
   {!wide ? <ClepitBrand size={32} /> : null}
   <View style={{ flexDirection: 'row', gap: 10 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Notificaciones, ${count} sin leer`} onPress={openPanel} style={s.round}>
     <Animated.View style={{ transform: [{ rotate: rotation.interpolate({ inputRange: [-1, 1], outputRange: ['-14deg', '14deg'] }) }] }}><Ionicons name="notifications-outline" size={21} color={Colors.primary} /></Animated.View>
     {count > 0 ? <View style={s.count}><Text style={{ fontSize: 10, lineHeight: 15, color: Colors.white, fontWeight: '700' }}>{count > 99 ? '99+' : count}</Text></View> : null}
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Abrir mi perfil" onPress={() => router.push('/(protected)/(tabs)/profile')} style={[s.round, { backgroundColor: Colors.primarySoft, borderColor: Colors.primarySoft }]}>
     <Text style={{ color: Colors.primaryText, fontWeight: '800', fontSize: 14 }}>{`${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || '•'}</Text>
    </Pressable>
   </View>
  </View>
  {notice ? <View accessibilityLiveRegion="polite" style={[s.toast, wide ? s.toastWide : null]}>
   <IconTile icon={notice.Kind === 'REJECTED' ? 'close-circle-outline' : notice.Kind === 'APPROVED' ? 'checkmark-circle-outline' : 'hourglass-outline'} tone={notice.Kind === 'REJECTED' ? 'danger' : notice.Kind === 'APPROVED' ? 'success' : 'warning'} size={38} />
   <Pressable accessibilityRole="button" onPress={() => { void openNotice(notice.Id); }} style={{ flex: 1, gap: 2 }}><Text style={{ fontWeight: '700', fontSize: 14 }}>{notice.title}</Text><Text numberOfLines={2} style={kit.caption}>{count > 1 ? `Tienes ${count} avisos sin leer. Toca para abrir el más reciente.` : 'Toca para abrirla.'}</Text></Pressable>
   <Pressable accessibilityRole="button" accessibilityLabel="Cerrar aviso" hitSlop={8} onPress={() => setNotice(null)}><Ionicons name="close" size={20} color={Colors.textMuted} /></Pressable>
  </View> : null}
  <Sheet visible={visible} title={group ? sections.find(item => item.kind === group)?.title ?? 'Avisos' : 'Avisos'} onClose={() => setVisible(false)}>
   {error ? <Banner tone="danger">{error}</Banner> : null}
   {Platform.OS !== 'web' && push.status !== 'ready' ? <Banner tone="info" icon="phone-portrait-outline" title="Avisos en el teléfono" action={!['server-pending', 'unavailable'].includes(push.status) ? <Button compact variant="secondary" loading={push.status === 'loading'} title={push.status === 'denied' ? 'Permitir en Ajustes' : 'Activar'} style={{ alignSelf: 'flex-start' }} onPress={() => { void push.enable(); }} /> : undefined}>{push.message}</Banner> : null}
   {!items.length ? <EmptyState icon="notifications-off-outline" title="Sin avisos nuevos" /> : !group ? sections.map(section => {
    const total = items.filter(item => item.Kind === section.kind).length;
    return total ? <Pressable key={section.kind} accessibilityRole="button" onPress={() => setGroup(section.kind)} style={s.item}><IconTile icon={section.icon} tone={section.tone} size={40} /><View style={{ flex: 1 }}><Text style={{ fontWeight: '700' }}>{section.title}</Text><Text style={kit.caption}>{total} sin leer</Text></View><Ionicons name="chevron-forward" size={19} color={Colors.textMuted} /></Pressable> : null;
   }) : <>
    <Button compact variant="ghost" icon="chevron-back" title="Todos los avisos" style={{ alignSelf: 'flex-start' }} onPress={() => setGroup(null)} />
    {items.filter(item => item.Kind === group).map(item => <Pressable key={item.Id} accessibilityRole="button" onPress={() => { void openNotice(item.Id); }} style={s.item}><View style={{ flex: 1, gap: 2 }}><Text style={{ fontWeight: '700', fontSize: 14 }}>{item.title}</Text><Text style={kit.caption}>{item.body}</Text><Text style={kit.caption}>{dateTime(item.CreatedAt)}</Text></View><Ionicons name="chevron-forward" size={19} color={Colors.textMuted} /></Pressable>)}
   </>}
  </Sheet>
 </>;
}

const s = StyleSheet.create({
 bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 8, backgroundColor: Colors.background },
 floating: { position: 'absolute', top: 10, right: 24, zIndex: 20, paddingHorizontal: 0, backgroundColor: 'transparent' },
 round: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
 count: { position: 'absolute', right: -4, top: -4, minWidth: 19, paddingHorizontal: 4, alignItems: 'center', backgroundColor: Colors.accent, borderRadius: 10, borderWidth: 2, borderColor: Colors.background },
 toast: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 18, marginBottom: 6, padding: 12, borderRadius: BorderRadius.lg, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, ...Shadows.card },
 toastWide: { position: 'absolute', right: 24, top: 62, width: 360, marginHorizontal: 0, marginBottom: 0, zIndex: 30, ...Shadows.raised },
 item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border },
});
