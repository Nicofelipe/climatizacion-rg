import { useCallback, useState } from 'react';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { requestJson } from '@/api/http';
import { useAuth } from '@/hooks/useAuth';
import AppContainer from '@/components/layout/AppContainer';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Colors } from '@/theme';
import RefreshableScrollView from '@/components/common/RefreshableScrollView';
interface Employee{Id:number;FirstName:string;LastName:string;Email:string;Phone:string|null;Role:string;ReceiptCount:number;PendingCount:number;ApprovedCount:number;RejectedCount:number}
export default function Employees(){
  const wide=useWindowDimensions().width>=760;
  const {user,token}=useAuth();const [employees,setEmployees]=useState<Employee[]>([]);const [selected,setSelected]=useState<Employee|null>(null);
  const [reason,setReason]=useState('');const [message,setMessage]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [attempt,setAttempt]=useState(0);
  const [refreshing,setRefreshing]=useState(false);
  const url=`${process.env.EXPO_PUBLIC_API_URL}/users`;
  useFocusEffect(useCallback(()=>{let active=true;if(user?.role==='ADMIN'&&token){setRefreshing(true);setError('');requestJson(url,{headers:{Authorization:`Bearer ${token}`}}).then(result=>{if(active)setEmployees(result.employees);}).catch(()=>{if(active)setError('No fue posible cargar los trabajadores.');}).finally(()=>{if(active)setRefreshing(false);});}return()=>{active=false;};},[url,token,user?.role,attempt]));
  if(user?.role!=='ADMIN')return <Redirect href="/(protected)/(tabs)/profile"/>;
  async function save(){if(!selected||busy)return;setError('');if(!reason.trim()){setError('Indica el motivo del cambio.');return;}setBusy(true);
    try{const result=await requestJson(`${url}/${selected.Id}`,{method:'PUT',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({firstName:selected.FirstName,lastName:selected.LastName,email:selected.Email,phone:selected.Phone??'',reason})});setMessage(result.message);setSelected(null);setAttempt(n=>n+1);}
    catch(err){setError(err instanceof Error?err.message:'No fue posible guardar.');}finally{setBusy(false);}}
  return <AppContainer><RefreshableScrollView refreshing={refreshing} onRefresh={()=>setAttempt(n=>n+1)} keyboardShouldPersistTaps="handled" contentContainerStyle={{gap:12,paddingBottom:30,width:'100%',maxWidth:1050,alignSelf:'center'}}>
    <Text style={{fontSize:26,fontWeight:'700',color:Colors.text}}>Equipo y rendiciones</Text><Text style={{color:Colors.textSecondary,fontSize:12,lineHeight:19}}>Selecciona un integrante para revisar sus boletas. Incluye trabajadores y administradores.</Text>
    <Pressable accessibilityRole="button" onPress={()=>router.push('/(protected)/employees/create')} style={{alignSelf:'flex-start',paddingHorizontal:16,paddingVertical:11,borderRadius:11,backgroundColor:Colors.primary}}><Text style={{color:'white',fontSize:13,fontWeight:'700'}}>+ Registrar trabajador</Text></Pressable>
    {message?<Text accessibilityRole="alert" style={{color:Colors.primary}}>{message}</Text>:null}{error?<Text accessibilityRole="alert" style={{color:Colors.danger}}>{error}</Text>:null}
    {selected?<View style={{gap:14,padding:20,backgroundColor:'white',borderRadius:20}}>
      <Input label="Nombre" value={selected.FirstName} onChangeText={value=>setSelected({...selected,FirstName:value})}/>
      <Input label="Apellido" value={selected.LastName} onChangeText={value=>setSelected({...selected,LastName:value})}/>
      <Input label="Correo de acceso" value={selected.Email} onChangeText={value=>setSelected({...selected,Email:value})} keyboardType="email-address"/>
      <Input label="Teléfono" value={selected.Phone??''} onChangeText={value=>setSelected({...selected,Phone:value})}/>
      <Input label="Motivo obligatorio" value={reason} onChangeText={setReason}/>
      <Button title="Guardar cambios con historial" onPress={save} loading={busy}/><Button title="Cancelar" disabled={busy} onPress={()=>setSelected(null)}/>
    </View>:employees.map(employee=><View key={employee.Id} style={{padding:14,borderRadius:16,backgroundColor:'white',gap:12,borderWidth:1,borderColor:Colors.border,flexDirection:wide?'row':'column',alignItems:wide?'center':undefined}}>
      <View style={{flexDirection:'row',gap:10,alignItems:'center',flex:wide?1:undefined}}><View style={{width:36,height:36,borderRadius:12,backgroundColor:'#DDF4ED',alignItems:'center',justifyContent:'center'}}><Text style={{color:Colors.primary,fontWeight:'800',fontSize:14}}>{employee.FirstName[0]}{employee.LastName[0]}</Text></View><View style={{flex:1,gap:4}}><Text style={{fontWeight:'700',color:Colors.text,fontSize:14}}>{employee.FirstName} {employee.LastName}{employee.Id===user.id?' · Yo':''}</Text><Text style={{color:Colors.textSecondary,fontSize:11}}>{employee.Role==='ADMIN'?'Administrador':'Trabajador'} · {employee.Email}</Text></View></View>
      <View style={{gap:4,flex:wide?0.9:undefined}}><Text style={{color:Colors.text,fontSize:12,fontWeight:'600'}}>{employee.ReceiptCount} boletas</Text><Text style={{color:Colors.textSecondary,fontSize:11,lineHeight:18}}>{employee.PendingCount} pendientes · {employee.ApprovedCount} aprobadas · {employee.RejectedCount} rechazadas</Text></View>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}><Pressable accessibilityRole="button" onPress={()=>router.push({pathname:'/(protected)/(tabs)/expenses',params:{workerId:String(employee.Id),view:undefined}})} style={{paddingHorizontal:13,paddingVertical:10,borderRadius:10,backgroundColor:Colors.primary}}><Text style={{color:'white',fontSize:12,fontWeight:'700'}}>Ver rendiciones</Text></Pressable>
      {employee.Role==='EMPLOYEE'?<Pressable accessibilityRole="button" accessibilityLabel={`Editar trabajador ${employee.FirstName} ${employee.LastName}`} onPress={()=>{setSelected({...employee});setReason('');setError('');setMessage('');}} style={{paddingHorizontal:13,paddingVertical:10,borderRadius:10,backgroundColor:'#E7F3EF'}}><Text style={{color:Colors.primary,fontSize:12,fontWeight:'600'}}>Editar</Text></Pressable>:null}</View>
    </View>)}
    <Pressable accessibilityRole="button" onPress={()=>router.replace('/(protected)/(tabs)/profile')} style={{alignSelf:'flex-start',paddingVertical:12}}><Text style={{color:Colors.primary,fontSize:12,fontWeight:'600'}}>← Volver al perfil</Text></Pressable>
  </RefreshableScrollView></AppContainer>;
}
