import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {Colors} from '@/theme';

export default function ReceiptEntryOptions({replace=false}:{replace?:boolean}){
 const options=[
  {title:'Escanear boleta',description:'Toma una foto y revisa los datos detectados.',icon:'scan-outline',path:'/(protected)/expenses/scan'},
  {title:'Registro manual',description:'Completa los datos y adjunta la foto.',icon:'create-outline',path:'/(protected)/expenses/create'},
 ] as const;
 return <View style={styles.options}>{options.map(item=><Pressable key={item.path} accessibilityRole="button" onPress={()=>replace?router.replace(item.path):router.push(item.path)} style={({pressed})=>[styles.card,pressed&&{backgroundColor:'#EAF7F1',borderColor:Colors.primary}]}>
  <View style={styles.icon}><Ionicons name={item.icon} size={25} color={Colors.primary}/></View>
  <Text style={styles.title}>{item.title}</Text><Text style={styles.description}>{item.description}</Text>
  <Ionicons name="arrow-forward-outline" size={18} color={Colors.primary} style={{marginTop:8}}/>
 </Pressable>)}</View>;
}
const styles=StyleSheet.create({options:{flexDirection:'row',flexWrap:'wrap',gap:12,marginVertical:12},card:{flex:1,minWidth:140,padding:16,borderRadius:20,borderWidth:1,borderColor:'#DFEAE8',backgroundColor:'white',gap:8},icon:{width:44,height:44,borderRadius:14,backgroundColor:'#E4F5EF',alignItems:'center',justifyContent:'center'},title:{fontSize:15,fontWeight:'700',color:Colors.text},description:{fontSize:12,lineHeight:18,color:Colors.textSecondary}});
