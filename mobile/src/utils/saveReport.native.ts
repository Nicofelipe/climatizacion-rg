import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
export async function saveReport(filename:string,base64:string,mimeType:string){
 if(!await Sharing.isAvailableAsync())throw new Error('Este dispositivo no permite guardar o compartir archivos.');
 if(!FileSystem.cacheDirectory)throw new Error('No fue posible preparar el archivo en este dispositivo.');
 const uri=FileSystem.cacheDirectory+filename.replace(/[^A-Za-z0-9_.-]/g,'_');
 try{
  await FileSystem.writeAsStringAsync(uri,base64,{encoding:FileSystem.EncodingType.Base64});
  await Sharing.shareAsync(uri,{mimeType,dialogTitle:'Guardar o compartir Excel',UTI:'org.openxmlformats.spreadsheetml.sheet'});
 }finally{await FileSystem.deleteAsync(uri,{idempotent:true}).catch(()=>{});}
}
