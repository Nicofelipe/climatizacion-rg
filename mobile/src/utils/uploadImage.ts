export async function uploadImageBlob(uri:string,mimeType:string){
 const response=await fetch(uri);if(!response.ok)throw new Error('No fue posible leer la imagen. Selecciónala nuevamente.');
 const blob=await response.blob();
 if(!blob.size)throw new Error('La imagen está vacía.');
 if(blob.size>10*1024*1024)throw new Error('La imagen supera los 10 MB. Selecciona una foto más pequeña.');
 return blob;
}
