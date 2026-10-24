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
import {setScannedReceiptDraft} from '@/utils/scannedReceiptDraft';

export default function ScanReceipt(){
 const {user}=useAuth();const [uri,setUri]=useState(''),[mime,setMime]=useState('image/jpeg'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[warnings,setWarnings]=useState<string[]>([]);
 const [number,setNumber]=useState(''),[date,setDate]=useState(''),[total,setTotal]=useState(''),[vat,setVat]=useState(''),[type,setType]=useState<number|null>(null),[confirmed,setConfirmed]=useState(false),[read,setRead]=useState(false);
 const attempt=useRef(0);
 const [expanded,setExpanded]=useState(false),[ratio,setRatio]=useState(1.5);const screen=useWindowDimensions();const enlargedWidth=Math.max(800,screen.width*2);
 useEffect(()=>()=>{attempt.current++;},[]);
 async function pick(camera:boolean){
  if(busy)return;setError('');
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
 function continueToForm(){
  if(!user||busy)return;setError('');
  if(!uri){setError('La foto de la boleta es obligatoria.');return;}
  if(!number.trim()||number.trim().length>50){setError('Revisa el número de boleta (máximo 50 caracteres).');return;}
  const dateError=receiptSubmissionError(date);if(dateError){setError(dateError);return;}
  if(!/^\d+$/.test(total)||Number(total)<=0||Number(total)>999999999||!/^\d+$/.test(vat)||Number(vat)>Number(total)){setError('Revisa el total y el IVA en pesos enteros; el IVA no puede superar el total.');return;}
  if(!type||!confirmed){setError('Selecciona el tipo de gasto y confirma que revisaste los datos.');return;}
  setScannedReceiptDraft({userId:user.id,companyId:user.companyId,uri,mimeType:mime,receiptNumber:number.trim(),expenseDate:date,totalAmount:total,vatAmount:vat,expenseTypeId:type});
  router.replace({pathname:'/(protected)/expenses/create',params:{fromScan:'1'}});
 }
 return <AppContainer><FormScrollView contentContainerStyle={{paddingBottom:40,gap:18}}>
  <Pressable onPress={()=>router.back()}><Text style={{color:Colors.primary}}>← Volver</Text></Pressable>
  <Text style={{fontSize:27,fontWeight:'800',color:Colors.text}}>Escanear boleta</Text>
  <View style={{padding:14,borderRadius:14,backgroundColor:'#FFF4D6'}}><Text style={{color:'#74520A',lineHeight:21}}>CLEPIT PRUEBAS · La lectura se realiza en este teléfono. Los datos pueden contener errores y siempre debes revisarlos. No se guarda nada automáticamente.</Text></View>
  <Button title="Tomar foto de la boleta" onPress={()=>{void pick(true);}} disabled={busy}/>
  <Button variant="secondary" title="Elegir imagen de la galería" onPress={()=>{void pick(false);}} disabled={busy}/>
  {uri?<Pressable accessibilityRole="button" accessibilityLabel="Ampliar foto para comprobar los datos" onPress={()=>setExpanded(true)}><Image source={{uri}} style={{width:'100%',height:280,borderRadius:14,backgroundColor:'#EEF2F6'}} resizeMode="contain"/><Text style={{textAlign:'center',color:Colors.primary,marginTop:8}}>Toca para ampliar y revisar la foto</Text></Pressable>:null}
  {busy?<View style={{gap:10}}><ActivityIndicator color={Colors.primary}/><Text style={{textAlign:'center',color:Colors.textSecondary}}>Leyendo los datos en el teléfono…</Text></View>:null}
  {error?<Text accessibilityRole="alert" style={{color:Colors.danger}}>{error}</Text>:null}
  {read&&!busy?<>
   <Text style={{fontSize:19,fontWeight:'700',color:Colors.text}}>Comprueba los datos de la foto</Text>
   <Text style={{color:Colors.textSecondary,lineHeight:20}}>Todos los campos son obligatorios, además de la foto y el tipo de gasto. Si la boleta indica IVA cero o exento, escribe 0; no dejes el campo vacío.</Text>
   {warnings.map(warning=><Text key={warning} style={{color:'#946200',lineHeight:20}}>• {warning}</Text>)}
   <Input label="Número de boleta" value={number} onChangeText={v=>{setNumber(v);setConfirmed(false);}}/>
   <Input label="Fecha de emisión · AAAA-MM-DD" value={date} onChangeText={v=>{setDate(v);setConfirmed(false);}}/>
   <Input label="Monto total · CLP" keyboardType="numeric" value={total} onChangeText={v=>{setTotal(v);setConfirmed(false);}}/>
   <Input label="IVA leído · CLP (referencia de la foto)" keyboardType="numeric" value={vat} onChangeText={v=>{setVat(v);setConfirmed(false);}}/>
   <Text style={{color:Colors.textSecondary,lineHeight:20}}>El IVA leído se conserva como referencia en la descripción. El IVA final de la rendición lo calcula el servidor según el tipo de gasto y las reglas de tu empresa.</Text>
   <Text style={{fontWeight:'700',color:Colors.text}}>Selecciona el tipo de gasto</Text>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>{expenseTypes.map(item=><View key={item.id} style={{flexBasis:'46%',flexGrow:1}}><Button variant="choice" title={item.name} selected={type===item.id} onPress={()=>{setType(item.id);setConfirmed(false);}}/></View>)}</View>
   <Pressable accessibilityRole="checkbox" accessibilityState={{checked:confirmed}} onPress={()=>setConfirmed(v=>!v)} style={{flexDirection:'row',gap:10,paddingVertical:10}}><Ionicons name={confirmed?'checkbox':'square-outline'} size={25} color={Colors.primary}/><Text style={{flex:1,color:Colors.text,lineHeight:21}}>Revisé el número, la fecha, el monto y el IVA contra la imagen.</Text></Pressable>
   <Button title="Usar estos datos en el formulario" onPress={continueToForm}/>
   <Text style={{color:Colors.textSecondary,lineHeight:20}}>El siguiente paso permite revisar todo nuevamente. Solo Guardar boleta enviará el registro a tu empresa con esta misma foto.</Text>
  </>:null}
 </FormScrollView><Modal visible={expanded} onRequestClose={()=>setExpanded(false)}><SafeAreaView style={{flex:1,backgroundColor:'#142D4E',padding:12,gap:12}}><Button title="Volver a los datos" onPress={()=>setExpanded(false)}/><Text style={{color:'white',fontSize:12}}>Desliza para recorrer la boleta ampliada.</Text><ScrollView horizontal><ScrollView nestedScrollEnabled><Image source={{uri}} style={{width:enlargedWidth,height:Math.min(20000,enlargedWidth*ratio)}} resizeMode="contain"/></ScrollView></ScrollView></SafeAreaView></Modal></AppContainer>;
}
