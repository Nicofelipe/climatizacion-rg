import { Colors } from '@/theme';
import * as WebBrowser from 'expo-web-browser';
import { Platform, View } from 'react-native';
import Text from '@/components/ui/Text';
if(Platform.OS==='web')WebBrowser.maybeCompleteAuthSession();
export default function GoogleLoginReturn(){return <View style={{flex:1,justifyContent:'center',alignItems:'center',padding:24,backgroundColor:Colors.background}}><Text style={{color:Colors.text,fontSize:18}}>Volviendo a la aplicación…</Text><Text style={{color:Colors.textMuted,marginTop:12}}>Si esta ventana no se cierra, vuelve a la ventana donde iniciaste el acceso.</Text></View>;}
