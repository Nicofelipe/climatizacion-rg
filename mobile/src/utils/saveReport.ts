export async function saveReport(filename:string,base64:string,mimeType:string){
 const bytes=Uint8Array.from(atob(base64),char=>char.charCodeAt(0));
 const url=URL.createObjectURL(new Blob([bytes],{type:mimeType}));
 const link=document.createElement('a');link.href=url;link.download=filename;
 document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
