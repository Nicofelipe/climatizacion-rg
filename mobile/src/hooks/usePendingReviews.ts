import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { usePathname } from 'expo-router';
import { requestJson } from '@/api/http';

export function usePendingReviews(token:string|null,admin:boolean){
  const [count,setCount]=useState(0);
  const [notice,setNotice]=useState(0);
  const known=useRef<Set<number>|null>(null);
  const refresh=useRef<()=>void>(()=>{});
  const path=usePathname();
  useEffect(()=>{
    let active=true,busy=false;
    known.current=null;setCount(0);setNotice(0);
    if(!token||!admin)return;
    async function load(){
      if(!active||busy||AppState.currentState==='background'||AppState.currentState==='inactive')return;
      busy=true;
      try{
        const result:{ids:number[];count:number}=await requestJson(`${process.env.EXPO_PUBLIC_API_URL}/expenses/pending-review`,{headers:{Authorization:`Bearer ${token}`}});
        if(!active)return;
        const added=result.ids.filter(id=>!known.current?.has(id)).length;
        setCount(result.count);
        if(added>0)setNotice(added);
        if(result.count===0)setNotice(0);
        known.current=new Set(result.ids);
      }catch{/* Preserve the last confirmed count during a temporary outage. */}
      finally{busy=false;}
    }
    refresh.current=load;void load();
    const timer=setInterval(load,30000);
    const subscription=AppState.addEventListener('change',state=>{if(state==='active')void load();});
    return()=>{active=false;clearInterval(timer);subscription.remove();refresh.current=()=>{};};
  },[token,admin]);
  useEffect(()=>{refresh.current();},[path]);
  return {count,notice,dismiss:()=>setNotice(0)};
}
