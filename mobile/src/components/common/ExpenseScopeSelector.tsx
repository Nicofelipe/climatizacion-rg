import { Pressable, Text, View } from 'react-native';
import { Colors } from '@/theme';
export default function ExpenseScopeSelector({value,onChange}:{value:'personal'|'company';onChange:(value:'personal'|'company')=>void}){
  return <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{([{value:'company',label:'Toda la empresa'},{value:'personal',label:'Mis boletas'}] as const).map(item=><Pressable key={item.value} accessibilityRole="button" accessibilityState={{selected:value===item.value}} onPress={()=>onChange(item.value)} style={{paddingHorizontal:16,paddingVertical:12,borderRadius:14,backgroundColor:value===item.value?Colors.primary:'white',borderColor:Colors.border,borderWidth:1}}><Text style={{fontSize:13,fontWeight:'700',color:value===item.value?'white':Colors.textSecondary}}>{item.label}</Text></Pressable>)}</View>;
}
