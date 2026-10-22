import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { requestJson } from '@/api/http';
import { Colors } from '@/theme';
import { formatCurrency } from '@/utils/currency';

interface Entry { Id:number; Action:string; Actor:string|null; CreatedAt:string; BeforeData:string|null; AfterData:string|null; Reason:string|null }
export default function ExpenseHistory({id,token,admin,date,amount,syncPending,onChanged}:{id:number;token:string;admin:boolean;date:string;amount:number;syncPending?:boolean;onChanged:()=>void}) {
  const [entries,setEntries]=useState<Entry[]>([]);
  const [editing,setEditing]=useState(false);
  const [nextDate,setNextDate]=useState(date.slice(0,10));
  const [nextAmount,setNextAmount]=useState(String(amount));
  const [reason,setReason]=useState('');
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const url=`${process.env.EXPO_PUBLIC_API_URL}/expenses/${id}`;
  const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
  useEffect(()=>{let active=true;requestJson(`${url}/history`,{headers:{Authorization:`Bearer ${token}`}}).then(result=>{if(active)setEntries(result.history);}).catch(()=>{if(active)setError('No fue posible cargar el historial.');});return()=>{active=false;};},[url,token]);
  async function save(sync=false){
    if(busy)return;setError('');setMessage('');
    if(!sync&&(!reason.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(nextDate)||!/^\d+$/.test(nextAmount)||Number(nextAmount)<=0)){setError('Completa fecha AAAA-MM-DD, monto entero positivo y motivo.');return;}
    setBusy(true);
    try{const result=await requestJson(`${url}/${sync?'sync':'corrections'}`,{method:'POST',headers,...(!sync?{body:JSON.stringify({expenseDate:nextDate,totalAmount:Number(nextAmount),reason,expectedDate:date.slice(0,10),expectedAmount:amount})}:{})},90000);setMessage(result.message);setEditing(false);onChanged();}
    catch(err){setError(err instanceof Error?err.message:'No fue posible guardar.');}finally{setBusy(false);}
  }
  const snapshot=(json:string|null)=>{try{return json?JSON.parse(json):null;}catch{return null;}};
  return <View style={{gap:16,backgroundColor:'white',borderRadius:20,padding:20,borderWidth:1,borderColor:Colors.border}}>
    <Text style={{fontSize:20,fontWeight:'700',color:Colors.text}}>Historial y correcciones</Text>
    {syncPending?<><Text style={{color:'#A7670B'}}>La fecha se corrigió. El movimiento del respaldo en Drive está pendiente.</Text>{admin?<Button title="Reintentar sincronización de Drive" onPress={()=>save(true)} loading={busy}/>:null}</>:null}
    {admin&&!syncPending?<>{editing?<>
      <Text style={{color:Colors.textSecondary}}>La corrección conserva el estado de revisión y la imagen. Quedarán registrados tu nombre, el motivo y los valores anteriores y nuevos.</Text>
      <Input label="Fecha de la boleta (AAAA-MM-DD)" value={nextDate} onChangeText={setNextDate}/>
      <Input label="Monto total en CLP" value={nextAmount} onChangeText={setNextAmount} keyboardType="numeric"/>
      <Input label="Motivo de la corrección (obligatorio)" value={reason} onChangeText={value=>setReason(value.slice(0,1000))}/>
      <Button title="Guardar corrección con historial" onPress={()=>save()} loading={busy}/>
      <Button title="Cancelar corrección" onPress={()=>{setEditing(false);setError('');}} disabled={busy}/>
    </>:<Button title="Corregir fecha o monto" onPress={()=>{setNextDate(date.slice(0,10));setNextAmount(String(amount));setReason('');setEditing(true);}}/>}</>:null}
    {message?<Text accessibilityRole="alert" style={{color:Colors.primary}}>{message}</Text>:null}
    {error?<Text accessibilityRole="alert" style={{color:Colors.danger}}>{error}</Text>:null}
    {entries.map(entry=>{const before=snapshot(entry.BeforeData),after=snapshot(entry.AfterData);return <View key={entry.Id} style={{gap:7,paddingVertical:12,borderTopWidth:1,borderColor:Colors.border}}>
      <Text style={{fontWeight:'700',color:Colors.text}}>{({AUTO_APPROVE_SOLE_ADMIN:'Aprobación automática · administrador único',SELF_APPROVE_EXPENSE:'Confirmación propia · administrador único',CORRECT_EXPENSE:'Corrección administrativa',UPDATE_EXPENSE:'Edición de boleta',ROLLBACK_EXPENSE:'Edición revertida',APPROVE_EXPENSE:'Aprobación',REJECT_EXPENSE:'Rechazo'} as Record<string,string>)[entry.Action]??entry.Action}</Text>
      <Text style={{color:Colors.textSecondary,fontSize:12}}>{entry.Actor??'Usuario registrado'} · {new Date(entry.CreatedAt.endsWith('Z')?entry.CreatedAt:`${entry.CreatedAt}Z`).toLocaleString('es-CL')}</Text>
      {entry.Reason?<Text style={{color:Colors.text}}>Motivo: {entry.Reason}</Text>:null}
      {before&&after?<><Text style={{color:Colors.text}}>Fecha: {String(before.ExpenseDate).slice(0,10)} → {String(after.ExpenseDate).slice(0,10)}</Text><Text style={{color:Colors.text}}>Total: {formatCurrency(Number(before.TotalAmount))} → {formatCurrency(Number(after.TotalAmount))}</Text></>:null}
      {before&&after?(['ReceiptNumber','ExpenseTypeId','SupplierId','Description'] as const).filter(field=>before[field]!==after[field]).map(field=><Text key={field} style={{color:Colors.text}}>{({ReceiptNumber:'Código',ExpenseTypeId:'Tipo de gasto (ID)',SupplierId:'Proveedor (ID)',Description:'Descripción'})[field]}: {String(before[field]??'Sin dato')} → {String(after[field]??'Sin dato')}</Text>):null}
    </View>;})}
    {!entries.length&&!error?<Text style={{color:Colors.textSecondary}}>Sin movimientos registrados en el historial. Las modificaciones anteriores a esta función no se reconstruyen.</Text>:null}
  </View>;
}
