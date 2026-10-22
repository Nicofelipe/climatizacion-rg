import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DashboardPeriodSelector from './DashboardPeriodSelector';
import { availablePeriodOptions } from '@/utils/periodOptions';
import { Colors } from '@/theme';

export default function ReceiptDateFilter({label,value,onChange}:{label:string;value:string;onChange:(value:string)=>void}){
  const [open,setOpen]=useState(false);
  const [month,setMonth]=useState(availablePeriodOptions(0).currentPeriod);
  const [year,number]=month.split('-').map(Number);
  const offset=(new Date(Date.UTC(year,number-1,1)).getUTCDay()+6)%7;
  const count=new Date(Date.UTC(year,number,0)).getUTCDate();
  const button={padding:12,borderRadius:12,borderWidth:1,borderColor:Colors.border,backgroundColor:'white',gap:7} as const;
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value?value.split('-').reverse().join('/'):'sin límite'}`} onPress={()=>{setMonth(value?value.slice(0,7):availablePeriodOptions(0).currentPeriod);setOpen(true);}} style={[button,{flex:1,minWidth:135}]}>
      <Text style={{fontSize:11,color:Colors.textSecondary}}>{label}</Text><View style={{flexDirection:'row',alignItems:'center',gap:9}}><Ionicons name="calendar-outline" size={17} color={Colors.primary}/><Text style={{color:Colors.text,fontSize:13,fontWeight:'600'}}>{value?value.split('-').reverse().join('/'):'Elegir fecha'}</Text></View>
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={()=>setOpen(false)}><View style={{flex:1,backgroundColor:'#17233D88',justifyContent:'center',alignItems:'center',padding:20}}><View style={{width:'100%',maxWidth:390,padding:22,borderRadius:22,backgroundColor:'white',gap:20}} accessibilityViewIsModal>
      <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text style={{fontSize:20,fontWeight:'700',color:Colors.text}}>{label}</Text><Pressable accessibilityRole="button" accessibilityLabel="Cerrar calendario" onPress={()=>setOpen(false)}><Ionicons name="close" size={24} color={Colors.text}/></Pressable></View>
      <DashboardPeriodSelector value={month} onChange={setMonth}/>
      <View style={{flexDirection:'row',flexWrap:'wrap'}}>{['L','M','X','J','V','S','D'].map((day,index)=><Text key={`header-${index}`} style={{width:'14.2857%',textAlign:'center',paddingVertical:9,color:Colors.textSecondary,fontSize:12}}>{day}</Text>)}
        {Array.from({length:offset},(_,index)=><View key={`blank-${index}`} style={{width:'14.2857%'}}/>)}
        {Array.from({length:count},(_,index)=>{const date=`${month}-${String(index+1).padStart(2,'0')}`;return <Pressable key={date} accessibilityRole="button" accessibilityLabel={`Elegir ${date.split('-').reverse().join('/')}`} accessibilityState={{selected:date===value}} onPress={()=>{onChange(date);setOpen(false);}} style={{width:'14.2857%',height:40,alignItems:'center',justifyContent:'center',borderRadius:12,backgroundColor:date===value?Colors.primary:'transparent'}}><Text style={{fontSize:14,color:date===value?'white':Colors.text}}>{index+1}</Text></Pressable>;})}
      </View>
      <Pressable accessibilityRole="button" onPress={()=>{onChange('');setOpen(false);}}><Text style={{color:Colors.primary,fontWeight:'600'}}>Quitar límite de fecha</Text></Pressable>
    </View></View></Modal>
  </>;
}
