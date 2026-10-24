export function pushSummary(userId:number,companyId:number,count:number){
 return {tag:`clepit-${companyId}-${userId}`,title:'Clepit · Notificaciones',body:count===1?'Tienes una notificación nueva. Abre la aplicación para revisarla.':`Tienes ${count} notificaciones sin leer. Abre la aplicación para revisarlas.`,count};
}
