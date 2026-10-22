import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, ScrollViewProps, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme';
import { notifyDataRefresh } from '@/utils/refreshEvents';

export function useWebPullRefresh(refreshing:boolean,onRefresh:()=>void){
  const refresh=()=>{if(!refreshing){onRefresh();notifyDataRefresh();}};
  const y=useRef(0),start=useRef<number|null>(null),distance=useRef(0);
  const [ready,setReady]=useState(false);
  const handlers:Pick<ScrollViewProps,'onScroll'|'onTouchStart'|'onTouchMove'|'onTouchEnd'|'onTouchCancel'>=Platform.OS==='web'?{
    onScroll:event=>{y.current=event.nativeEvent.contentOffset.y;},
    onTouchStart:event=>{start.current=y.current<=0&&!refreshing?event.nativeEvent.pageY:null;distance.current=0;},
    onTouchMove:event=>{distance.current=start.current===null?0:event.nativeEvent.pageY-start.current;setReady(distance.current>=75);},
    onTouchEnd:()=>{if(start.current!==null&&distance.current>=75&&!refreshing)refresh();start.current=null;distance.current=0;setReady(false);},
    onTouchCancel:()=>{start.current=null;distance.current=0;setReady(false);},
  }:{};
  const control=Platform.OS==='web'?<View style={{alignItems:'flex-end',paddingBottom:8}}><Pressable accessibilityRole="button" accessibilityLabel="Actualizar esta pantalla" disabled={refreshing} onPress={refresh} style={{flexDirection:'row',alignItems:'center',gap:7,padding:9}}>{refreshing?<ActivityIndicator size="small" color={Colors.primary}/>:<Ionicons name="refresh-outline" size={16} color={Colors.primary}/>}<Text style={{color:Colors.primary,fontSize:12,fontWeight:'600'}}>{refreshing?'Actualizando…':ready?'Suelta para actualizar':'Actualizar'}</Text></Pressable></View>:null;
  return {handlers,control,refresh};
}

export default function RefreshableScrollView({refreshing,onRefresh,children,...props}:ScrollViewProps&{refreshing:boolean;onRefresh:()=>void}){
  const {handlers,control,refresh}=useWebPullRefresh(refreshing,onRefresh);
  return <ScrollView {...props} {...handlers} scrollEventThrottle={16} alwaysBounceVertical refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary}/>}>{control}{children}</ScrollView>;
}
