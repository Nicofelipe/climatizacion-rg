const listeners=new Set<()=>void>();
export function notifyDataRefresh(){listeners.forEach(listener=>listener());}
export function onDataRefresh(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};}
