import { Text,View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
export default function ErrorBanner({message}:{message:string}){
  return <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={{backgroundColor:'#FEF2F2',borderColor:'#FCA5A5',borderWidth:1,borderRadius:12,padding:13,flexDirection:'row',gap:9,alignItems:'center'}}><Ionicons name="alert-circle-outline" size={21} color="#B91C1C"/><Text style={{color:'#B91C1C',fontSize:13,lineHeight:20,flex:1}}>{message}</Text></View>;
}
