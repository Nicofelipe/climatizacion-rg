import {createContext,ReactNode,useCallback,useContext,useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,Animated,Easing,useWindowDimensions,View} from 'react-native';
import {useFocusEffect} from 'expo-router';

export const ChartScrollContext=createContext(0);

// Restart only when the chart enters the viewport or its tab gains focus.
export default function ChartEntrance({children}:{children:(progress:number)=>ReactNode}){
 const tick=useContext(ChartScrollContext),{height}=useWindowDimensions();
 const ref=useRef<View>(null),value=useRef(new Animated.Value(1)).current;
 const [progress,setProgress]=useState(1),visible=useRef(false),reduced=useRef(true),focused=useRef(false);
 const play=useCallback(()=>{
  value.stopAnimation();if(reduced.current){value.setValue(1);return;}
  value.setValue(0);Animated.timing(value,{toValue:1,duration:650,easing:Easing.out(Easing.cubic),useNativeDriver:false}).start();
 },[value]);
 const measure=useCallback(()=>{ref.current?.measureInWindow((_x,y,_width,h)=>{
  const next=h>0&&y<height-50&&y+h>70;
  if(next&&!visible.current&&focused.current)play();visible.current=next;
 });},[height,play]);
 useEffect(()=>{const id=value.addListener(({value:next})=>setProgress(next));return()=>value.removeListener(id);},[value]);
 useEffect(()=>{let alive=true;void AccessibilityInfo.isReduceMotionEnabled().then(enabled=>{if(alive){reduced.current=enabled;if(!enabled&&visible.current&&focused.current)play();}});
  const listener=AccessibilityInfo.addEventListener('reduceMotionChanged',enabled=>{reduced.current=enabled;if(enabled){value.stopAnimation();value.setValue(1);}});
  return()=>{alive=false;listener.remove();};
 },[play,value]);
 useFocusEffect(useCallback(()=>{focused.current=true;visible.current=false;const timer=setTimeout(measure,50);return()=>{focused.current=false;visible.current=false;clearTimeout(timer);value.stopAnimation();};},[measure,value]));
 useEffect(()=>{measure();},[tick,measure]);
 return <View ref={ref} collapsable={false} onLayout={measure}>{children(progress)}</View>;
}
