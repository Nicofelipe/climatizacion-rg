import {useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Image,Modal,Pressable,ScrollView,Text,useWindowDimensions,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {router} from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {Ionicons} from '@expo/vector-icons';
import AppContainer from '@/components/layout/AppContainer';
import FormScrollView from '@/components/common/FormScrollView';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import {Colors} from '@/theme';
import {expenseTypes} from '@/constants/expenseTypes';
import {useAuth} from '@/hooks/useAuth';
import {parseReceiptText,recognizeReceipt} from '@/utils/receiptOcr';
import {receiptSubmissionError} from '@/utils/receiptSubmission';
import {createExpenseApi} from '@/api/expense.api';
import {notifyDataRefresh} from '@/utils/refreshEvents';
import {estimateReceiptAmount} from '@/utils/receiptEstimate';

export default function ScanReceipt(){
 const {user,token}=useAuth();const [uri,setUri]=useState(''),[mime,setMime]=useState('image/jpeg'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[warnings,setWarnings]=useState<string[]>([]);
 const [saving,setSaving]=useState(false),[saved,setSaved]=useState<number|null>(null),[estimated,setEstimated]=useState('');const saveLock=useRef(false);
 const [number,setNumber]=useState(''),[date,setDate]=useState(''),[total,setTotal]=useState(''),[vat,setVat]=useState(''),[type,setType]=useState<number|null>(null),[confirmed,setConfirmed]=useState(false),[read,setRead]=useState(false);
 const attempt=useRef(0);
 const [expanded,setExpanded]=useState(false),[ratio,setRatio]=useState(1.5);const screen=useWindowDimensions();const enlargedWidth=Math.max(800,screen.width*2);
 useEffect(()=>()=>{attempt.current++;},[]);
 async function pick(camera:boolean){
  if(busy||saveLock.current||saved)return;setError('');setEstimated('');
  try{
   const permission=camera?await ImagePicker.requestCameraPermissionsAsync():await ImagePicker.requestMediaLibraryPermissionsAsync();
   if(!permission.granted){setError(camera?'Permite la cámara para tomar la foto.':'Permite el acceso a fotos para elegir una imagen.');return;}
   const result=camera?await ImagePicker.launchCameraAsync({mediaTypes:['images'],quality:0.9}):await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],quality:0.9});
   if(result.canceled)return;
   const photo=result.assets[0],id=++attempt.current;setUri(photo.uri);setRatio(photo.height/Math.max(1,photo.width));setMime(photo.mimeType??'image/jpeg');setBusy(true);setConfirmed(false);setRead(false);setNumber('');setDate('');setTotal('');setVat('');setType(null);setWarnings([]);
   try{const value=parseReceiptText(await recognizeReceipt(photo.uri));if(id!==attempt.current)return;setNumber(value.receiptNumber);setDate(value.expenseDate);setTotal(value.totalAmount);setVat(value.vatAmount);setWarnings(value.warnings);setRead(true);}
   catch(err){if(id===attempt.current){setError(err instanceof Error?err.message:'No se pudo leer la foto.');setRead(true);}}
   finally{if(id===attempt.current)setBusy(false);}
  }catch{setError('No fue posible abrir la cámara o las fotos.');setBusy(false);}
 }
 async function continueToForm(){
  if(!user||busy||saveLock.current||saved)return;setError('');
  if(!token){setError('Vuelve a iniciar sesión para guardar.');return;}
  if(!uri){setError('La foto de la boleta es obligatoria.');return;}
  if(!number.trim()||number.trim().length>50){setError('Revisa el número de boleta (máximo 50 caracteres).');return;}
  const dateError=receiptSubmissionError(date);if(dateError){setError(dateError);return;}
  if(!/^\d+$/.test(total)||Number(total)<=0||Number(total)>999999999||!/^\d+$/.test(vat)||Number(vat)>Number(total)){setError('Revisa el total y el IVA en pesos enteros; el IVA no puede superar el total.');return;}
  if(!type||!confirmed){setError('Selecciona el tipo de gasto y confirma que revisaste los datos.');return;}
  saveLock.current=true;setSaving(true);
  try{const expense=await createExpenseApi(token,{receiptNumber:number.trim(),expenseDate:date,expenseTypeId:type,totalAmount:Number(total),imageUri:uri,imageMimeType:mime,description:`IVA revisado en escaneo (referencia): $${vat}.${estimated?' '+estimated:''}`});setSaved(expense.Id);notifyDataRefresh();}
  catch(err){setError(err instanceof Error?err.message:'No fue posible guardar. Tus datos siguen aquí.');}
  finally{saveLock.current=false;setSaving(false);}
 }
 return <AppContainer><FormScrollView contentContainerStyle={{paddingBottom:40,gap:18}}>
  <Pressable onPress={()=>router.back()}><Text style={{color:Colors.primary}}>← Volver</Text></Pressable>
  <Text style={{fontSize:27,fontWeight:'800',color:Colors.text}}>Escanear boleta</Text>
  <View style={{padding:14,borderRadius:14,backgroundColor:'#E4F5EF'}}><Text style={{color:Colors.primary,lineHeight:21}}>La lectura se realiza en este teléfono. Revisa los datos detectados y elige el tipo de gasto antes de guardar.</Text></View>
  <Button title="Tomar foto de la boleta" onPress={()=>{void pick(true);}} disabled={busy||saving||Boolean(saved)}/>
  <Button variant="secondary" title="Elegir imagen de la galería" onPress={()=>{void pick(false);}} disabled={busy||saving||Boolean(saved)}/>
  {uri?<Pressable accessibilityRole="button" accessibilityLabel="Ampliar foto para comprobar los datos" onPress={()=>setExpanded(true)}><Image source={{uri}} style={{width:'100%',height:280,borderRadius:14,backgroundColor:'#EEF2F6'}} resizeMode="contain"/><Text style={{textAlign:'center',color:Colors.primary,marginTop:8}}>Toca para ampliar y revisar la foto</Text></Pressable>:null}
  {busy?<View style={{gap:10}}><ActivityIndicator color={Colors.primary}/><Text style={{textAlign:'center',color:Colors.textSecondary}}>Leyendo los datos en el teléfono…</Text></View>:null}
  {error&&!read?<Text accessibilityRole="alert" style={{color:Colors.danger}}>{error}</Text>:null}
  {saved?<View style={{padding:18,backgroundColor:'#E2F5EE',borderRadius:16,gap:12}}><Text accessibilityRole="alert" style={{color:Colors.primary,fontWeight:'700'}}>Boleta guardada con su foto.</Text><Button title="Ver detalle de la boleta" onPress={()=>router.replace({pathname:'/(protected)/expenses/[id]',params:{id:String(saved)}})}/></View>:null}
  {read&&!busy&&!saved?<View pointerEvents={saving?'none':'auto'} style={{gap:18}}>
   <Text style={{fontSize:19,fontWeight:'700',color:Colors.text}}>Comprueba los datos de la foto</Text>
   <Text style={{color:Colors.textSecondary,lineHeight:20}}>Todos los campos son obligatorios, además de la foto y el tipo de gasto. Si la boleta indica IVA cero o exento, escribe 0; no dejes el campo vacío.</Text>
   {warnings.map(warning=><Text key={warning} style={{color:'#946200',lineHeight:20}}>• {warning}</Text>)}
   <Input label="Número de boleta" value={number} onChangeText={v=>{setNumber(v);setConfirmed(false);}}/>
   <Input label="Fecha de emisión · AAAA-MM-DD" value={date} onChangeText={v=>{setDate(v);setConfirmed(false);}}/>
   <Input label="Monto total · CLP" keyboardType="numeric" value={total} onChangeText={v=>{setTotal(v);setConfirmed(false);}}/>
   <Input label="IVA leído · CLP (referencia de la foto)" keyboardType="numeric" value={vat} onChangeText={v=>{setVat(v);setConfirmed(false);}}/>
   {(!vat&&/^\d+$/.test(total)&&Number(total)>0)||(!total&&/^\d+$/.test(vat)&&Number(vat)>0)?<View style={{padding:14,borderRadius:14,backgroundColor:'#FFF4D6',gap:10}}><Text style={{color:'#74520A',lineHeight:20}}>Solo para boletas íntegramente afectas a IVA 19%, sin montos exentos ni impuestos adicionales. El resultado es una estimación: compruébalo con la foto. No usar para combustible.</Text><Button variant="secondary" title={total?'Estimar IVA desde el total':'Proponer total estimado desde IVA'} disabled={type===2} onPress={()=>{const proposal=estimateReceiptAmount(total,vat,type);if(!proposal)return;if(proposal.field==='vat')setVat(proposal.value);else setTotal(proposal.value);setEstimated(proposal.note);setConfirmed(false);}}/></View>:null}
   {estimated?<Text style={{color:'#946200',lineHeight:20}}>{estimated} Confirma el monto exacto contra la foto antes de guardar.</Text>:null}
   <Text style={{color:Colors.textSecondary,lineHeight:20}}>El IVA leído se conserva como referencia en la descripción. El IVA final de la rendición lo calcula el servidor según el tipo de gasto y las reglas de tu empresa.</Text>
   <Text style={{fontWeight:'700',color:Colors.text}}>Selecciona el tipo de gasto</Text>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>{expenseTypes.map(item=><View key={item.id} style={{flexBasis:'46%',flexGrow:1}}><Button variant="choice" title={item.name} selected={type===item.id} onPress={()=>{setType(item.id);setConfirmed(false);}}/></View>)}</View>
   <Pressable accessibilityRole="checkbox" accessibilityState={{checked:confirmed}} onPress={()=>setConfirmed(v=>!v)} style={{flexDirection:'row',gap:10,paddingVertical:10}}><Ionicons name={confirmed?'checkbox':'square-outline'} size={25} color={Colors.primary}/><Text style={{flex:1,color:Colors.text,lineHeight:21}}>Revisé el número, la fecha, el monto y el IVA contra la imagen.</Text></Pressable>
   {error?<View accessibilityRole="alert" style={{padding:14,borderRadius:14,borderWidth:1,borderColor:'#FECACA',backgroundColor:'#FEF2F2',gap:6}}><Text style={{fontWeight:'700',color:'#991B1B'}}>No se pudo guardar la boleta</Text><Text style={{color:'#991B1B',lineHeight:21}}>{error}</Text><Text style={{color:'#991B1B',fontSize:12}}>La foto y los datos siguen aquí para que puedas revisarlos.</Text></View>:null}
   <Button title={saving?'Guardando boleta…':'Guardar boleta'} loading={saving} onPress={()=>{void continueToForm();}}/>
   <Text style={{color:Colors.textSecondary,lineHeight:20}}>Guardar boleta envía estos datos y la foto directamente a tu empresa.</Text>
  </View>:null}
 </FormScrollView><Modal visible={expanded} onRequestClose={()=>setExpanded(false)}><SafeAreaView style={{flex:1,backgroundColor:'#142D4E',padding:12,gap:12}}><Button title="Volver a los datos" onPress={()=>setExpanded(false)}/><Text style={{color:'white',fontSize:12}}>Desliza para recorrer la boleta ampliada.</Text><ScrollView horizontal><ScrollView nestedScrollEnabled><Image source={{uri}} style={{width:enlargedWidth,height:Math.min(20000,enlargedWidth*ratio)}} resizeMode="contain"/></ScrollView></ScrollView></SafeAreaView></Modal></AppContainer>;
}
