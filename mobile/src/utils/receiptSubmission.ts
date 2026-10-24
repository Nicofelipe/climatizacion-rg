export function receiptSubmissionError(value:unknown,now=new Date()):string|null{
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)return 'Selecciona una fecha de boleta válida.';
 const parts=new Intl.DateTimeFormat('en',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const today=['year','month','day'].map(type=>parts.find(part=>part.type===type)!.value).join('-');
 const year=Number(today.slice(0,4)),previous=today.slice(5)<='03-15';
 const first=`${year-(previous?1:0)}-01-01`;
 if(value>today)return 'La fecha de la boleta no puede ser futura.';
 if(value<first)return previous?`Solo puedes rendir boletas de ${year-1} y ${year}. El año anterior cierra el 15 de marzo inclusive.`:`El plazo del año anterior cerró el 15 de marzo. Solo puedes rendir boletas de ${year}.`;
 return null;
}
