export function notificationMessage(kind:string){
 if(kind==='PENDING_REVIEW')return {title:'Boletas por revisar',body:'Tienes una boleta pendiente de revisión. Abre la aplicación para ver el detalle.'};
 if(kind==='APPROVED')return {title:'Boleta aprobada',body:'Una de tus boletas fue aprobada. Abre la aplicación para ver el detalle.'};
 return {title:'Boleta rechazada',body:'Una de tus boletas fue rechazada. Revisa el motivo dentro de la aplicación.'};
}
