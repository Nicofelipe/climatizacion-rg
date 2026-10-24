import * as WebBrowser from 'expo-web-browser';
import { Platform, Text, View } from 'react-native';
if(Platform.OS==='web')WebBrowser.maybeCompleteAuthSession();
export default function GoogleLoginReturn(){return <View style={{flex:1,justifyContent:'center',alignItems:'center',padding:24,backgroundColor:'#F4F6FB'}}><Text style={{color:'#17233D',fontSize:18}}>Volviendo a la aplicación…</Text><Text style={{color:'#64748B',marginTop:12}}>Si esta ventana no se cierra, vuelve a la ventana donde iniciaste el acceso.</Text></View>;}
