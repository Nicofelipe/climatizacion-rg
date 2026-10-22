import { useCallback, useState } from 'react';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { requestJson } from '@/api/http';
import { useAuth } from '@/hooks/useAuth';
import AppContainer from '@/components/layout/AppContainer';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Colors } from '@/theme';
interface Employee{Id:number;FirstName:string;LastName:string;Email:string;Phone:string|null}
export default function Employees(){
  const {user,token}=useAuth();const [employees,setEmployees]=useState<Employee[]>([]);const [selected,setSelected]=useState<Employee|null>(null);
  const [reason,setReason]=useState('');const [message,setMessage]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [attempt,setAttempt]=useState(0);
  const url=`${process.env.EXPO_PUBLIC_API_URL}/users`;
  useFocusEffect(useCallback(()=>{let active=true;if(user?.role==='ADMIN'&&token)requestJson(url,{headers:{Authorization:`Bearer ${token}`}}).then(result=>{if(active)setEmployees(result.employees);}).catch(()=>{if(active)setError('No fue posible cargar los trabajadores.');});return()=>{active=false;};},[url,token,user?.role,attempt]));
  if(user?.role!=='ADMIN')return <Redirect href="/(protected)/(tabs)/profile"/>;
  async function save(){if(!selected||busy)return;setError('');if(!reason.trim()){setError('Indica el motivo del cambio.');return;}setBusy(true);
    try{const result=await requestJson(`${url}/${selected.Id}`,{method:'PUT',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({firstName:selected.FirstName,lastName:selected.LastName,email:selected.Email,phone:selected.Phone??'',reason})});setMessage(result.message);setSelected(null);setAttempt(n=>n+1);}
    catch(err){setError(err instanceof Error?err.message:'No fue posible guardar.');}finally{setBusy(false);}}
  return <AppContainer><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{gap:18,paddingBottom:30}}>
    <Text style={{fontSize:28,fontWeight:'700',color:Colors.text}}>Trabajadores</Text><Text style={{color:Colors.textSecondary}}>Gestiona los datos de los trabajadores de tu empresa. Cada modificación guarda responsable, fecha, motivo y valores anteriores y nuevos.</Text>
    <Button title="Registrar trabajador" onPress={()=>router.push('/(protected)/employees/create')}/>
    {message?<Text accessibilityRole="alert" style={{color:Colors.primary}}>{message}</Text>:null}{error?<Text accessibilityRole="alert" style={{color:Colors.danger}}>{error}</Text>:null}
    {selected?<View style={{gap:14,padding:20,backgroundColor:'white',borderRadius:20}}>
      <Input label="Nombre" value={selected.FirstName} onChangeText={value=>setSelected({...selected,FirstName:value})}/>
      <Input label="Apellido" value={selected.LastName} onChangeText={value=>setSelected({...selected,LastName:value})}/>
      <Input label="Correo de acceso" value={selected.Email} onChangeText={value=>setSelected({...selected,Email:value})} keyboardType="email-address"/>
      <Input label="Teléfono" value={selected.Phone??''} onChangeText={value=>setSelected({...selected,Phone:value})}/>
      <Input label="Motivo obligatorio" value={reason} onChangeText={setReason}/>
      <Button title="Guardar cambios con historial" onPress={save} loading={busy}/><Button title="Cancelar" disabled={busy} onPress={()=>setSelected(null)}/>
    </View>:employees.map(employee=><View key={employee.Id} style={{padding:20,borderRadius:20,backgroundColor:'white',gap:10}}><Text style={{fontWeight:'700',color:Colors.text}}>{employee.FirstName} {employee.LastName}</Text><Text style={{color:Colors.textSecondary}}>{employee.Email}</Text><Button title="Editar trabajador" onPress={()=>{setSelected({...employee});setReason('');setError('');setMessage('');}}/></View>)}
    <Button title="Volver al perfil" onPress={()=>router.replace('/(protected)/(tabs)/profile')}/>
  </ScrollView></AppContainer>;
}
