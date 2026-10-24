export {parseReceiptText} from './receiptOcrParser';
import {requireOptionalNativeModule} from 'expo-modules-core';
import {File} from 'expo-file-system';
export async function recognizeReceipt(uri:string):Promise<string>{
 const file=new File(uri);if(!file.exists||!file.size)throw new Error('No se puede leer esta imagen.');
 if(file.size>10*1024*1024)throw new Error('La imagen supera los 10 MB.');
 const module=requireOptionalNativeModule<{recognize:(uri:string)=>Promise<{text:string}>}>('ClepitReceiptOcr');
 if(!module)throw new Error('El lector requiere la APK Clepit Pruebas.');
 let timer:ReturnType<typeof setTimeout>|undefined;
 const result=await Promise.race([module.recognize(uri),new Promise<never>((_resolve,reject)=>{timer=setTimeout(()=>reject(new Error('La lectura tardó demasiado. Intenta con una foto más nítida.')),40000);})]).finally(()=>clearTimeout(timer));
 return result.text;
}
