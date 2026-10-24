import {File} from 'expo-file-system';
export async function uploadImageBlob(uri:string,_mimeType:string){
 const file=new File(uri);
 if(!file.exists||!file.size)throw new Error('No fue posible leer la imagen. Selecciónala nuevamente.');
 if(file.size>10*1024*1024)throw new Error('La imagen supera los 10 MB. Selecciona una foto más pequeña.');
 // Expo File exposes bytes() directly; React Native Blob rejects ArrayBuffer parts.
 return file;
}
