export interface ReceiptReading {receiptNumber:string;expenseDate:string;totalAmount:string;vatAmount:string;warnings:string[]}
const clean=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
function money(text:string){
 const raw=text.replace(/\s/g,'').replace(/\$/g,'').replace(/\.-$|,-$|\.$/,'');
 if(!/^\d[\d.,]*$/.test(raw))return '';
 // CLP: a decimal suffix of ,00/.00 is allowed; do not silently round cents.
 let value=raw;
 if(/[.,]\d{2}$/.test(value)){if(!/[.,]00$/.test(value))return '';value=value.slice(0,-3);}
 value=value.replace(/[.,]/g,'');const amount=Number(value);
 return Number.isSafeInteger(amount)&&amount>=0&&amount<=999999999?String(amount):'';
}
export function parseReceiptText(text:string):ReceiptReading{
 const lines=clean(text).split(/\r?\n/).map(line=>line.trim()).filter(Boolean).slice(0,1000);
 const result:ReceiptReading={receiptNumber:'',expenseDate:'',totalAmount:'',vatAmount:'',warnings:[]};
 const numbers=new Set<string>(),dates=new Set<string>(),totals=new Set<string>(),vats=new Set<string>();
 for(let i=0;i<lines.length;i++){
  const line=lines[i],next=lines[i+1]??'';
  if(/BOLETA|FOLIO/.test(line)&&!/(RUT|RESOLUCION|AUTORIZACION)/.test(line)){
   const explicit=line.match(/(?:FOLIO|N(?:RO|UMERO)?[°.º:]?\s*|NUMERO)\s*[:#-]?\s*(\d{1,20})(?![\d.-])/);
   if(explicit)numbers.add(explicit[1]);
   else if(/^(?:N[°.º:]?\s*)?\d{1,20}$/.test(next))numbers.add(next.replace(/\D/g,''));
  }
  if(/^(?:FOLIO|NRO|NUMERO|N[°.º])\s*[:#-]?\s*\d{1,20}$/.test(line))numbers.add(line.replace(/\D/g,''));
  if(!/VENCIMIENTO|RESOLUCION|AUTORIZACION/.test(line)){
   const candidates=[...line.matchAll(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](20\d{2})\b/g)];
   const iso=[...line.matchAll(/\b(20\d{2})-(\d{2})-(\d{2})\b/g)];
   for(const match of candidates){const value=`${match[3]}-${match[2].padStart(2,'0')}-${match[1].padStart(2,'0')}`;if(validDay(value))dates.add(value);}
   for(const match of iso){if(validDay(match[0]))dates.add(match[0]);}
  }
  const amount=(label:RegExp)=>{
   const match=line.match(label);if(!match)return '';
   const part=line.slice((match.index??0)+match[0].length).replace(/\(?\d{1,2}(?:[.,]\d+)?\s*%\)?/g,'').trim();
   // OCR may split a currency symbol and the amount into consecutive lines.
   const following=next==='$'?(lines[i+2]??''):next;
   const source=/\d/.test(part)?part:(/^[\d$.,\s-]+$/.test(following)?following:'');
   const found=[...source.matchAll(/\d[\d.,]*(?:[ \t]+\d{3}(?!\d))*[.,]?-?/g)].map(item=>money(item[0])).filter(value=>value!=='');
   return new Set(found).size===1?found[0]:'';
  };
  // Never promote subtotals, net amounts or payment/change amounts to the receipt total.
  if(!/SUB\s*TOTAL|TOTAL\s+(?:NETO|IVA|EXENTO)|EFECTIVO|VUELTO|PROPINA|TOTAL\s+(?:MINUTOS|PAGADO|AHORRO|DESCUENTO)/.test(line)){
   const value=amount(/^(?:(?:MONTO|IMPORTE|VALOR)\s+)?TOTAL\b(?:\s+(?:A\s+PAGAR|BOLETA|COMPRA|VENTA|FINAL))?\s*[:=$]?\s*/);if(value)totals.add(value);
  }
  const vat=amount(/\b(?:I\.?\s*V\.?\s*A\.?)(?=\s|[:($=]|$)/);if(vat)vats.add(vat);
 }
 const select=(set:Set<string>,name:string)=>{if(set.size===1)return [...set][0];result.warnings.push(set.size>1?`Hay varios valores posibles para ${name}. Confirma el correcto en la foto.`:`No se identificó ${name}. Complétalo manualmente.`);return '';};
 result.receiptNumber=select(numbers,'el número de boleta');result.expenseDate=select(dates,'la fecha');result.totalAmount=select(totals,'el total');result.vatAmount=select(vats,'el IVA');
 if(result.totalAmount&&result.vatAmount&&Number(result.vatAmount)>Number(result.totalAmount)){result.vatAmount='';result.warnings.push('El IVA leído supera el total. Revísalo.');}
 return result;
}
function validDay(value:string){const date=new Date(`${value}T12:00:00Z`);return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;}
