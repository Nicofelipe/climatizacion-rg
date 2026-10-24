// Labels must identify a receipt, rather than merely a nearby payment/reference number.
const marker = /^(?:NUMERO|NUM|NRO|NO|N(?:\s*O)?)(?=[\s\d.:#°º˚∘⁰○-]|$)(?:\s*[.°º˚∘⁰○])*\s*[:#-]?\s*/;
const beforeLabel = /(?:\bFOLIO|\bNUMERO|\bNUM|\bNRO|\bNO|\bN(?:\s*O)?)(?:\s*[.°º˚∘⁰○:])*\s*(?:DE\s*)?$/;
const otherReference = /\b(?:RUT|R\.U\.T|RESOLUCION|AUTORIZACION|TRANSACCION|OPERACION|TARJETA|PEDIDO|ORDEN|CAJA)\b/;
const punctuation = /^[\s.:#=-]+/;

function readNumber(text:string, explicit:boolean):string|null {
 const value=text.replace(punctuation,'');
 const match=value.match(/^(?:\d{1,3}(?:\.\d{3})+|\d+)/);
 if(!match)return null;
 const rest=value.slice(match[0].length);
 // Reject RUTs, dates, decimal amounts, truncated digit groups and multiple bare numbers.
 if(/^[\d.,/:-]|^\s+\d/.test(rest))return null;
 const number=match[0].replace(/\./g,'');
 if(number.length>20||(!explicit&&number.length<3))return null;
 return number;
}

export function receiptNumberCandidates(lines:string[]):Set<string> {
 const named=new Set<string>(),fallback=new Set<string>();
 for(let index=0;index<lines.length;index++){
  const line=lines[index];
  for(const label of line.matchAll(/\b(?:BOLETA(?=\b|ELECTRONICA|N(?:RO|UMERO|O|[°º])|\d)|BOL(?:\.|\b))/g)){
   let explicit=beforeLabel.test(line.slice(0,label.index));
   if(!line.slice(0,label.index).trim()&&index>0)explicit ||= beforeLabel.test(lines[index-1]);
   for(let offset=0;offset<=3&&index+offset<lines.length;offset++){
    let part=offset===0?line.slice(label.index+label[0].length):lines[index+offset];
    part=part.replace(punctuation,'').replace(/^(?:ELECTRONICA|ELECTR\.?|ELEC\.?)\s*/,'').replace(punctuation,'');
    const numbered=part.match(marker);
    if(numbered){explicit=true;part=part.slice(numbered[0].length);}
    if(!part.trim())continue;
    const number=readNumber(part,explicit);
    if(number!==null)named.add(number);
    break;
   }
  }
  // Preserve stand-alone labels when the OCR omits the heading; prefer named receipt fields.
  if(index>0&&otherReference.test(lines[index-1]))continue;
  const folio=line.match(/^FOLIO[.\s:#-]*/);
  const standalone=folio??line.match(marker);
  if(standalone){
   let rest=line.slice(standalone[0].length);
   if(!rest.trim()&&index+1<lines.length)rest=lines[index+1];
   const number=readNumber(rest,true);
   if(number!==null&&/^[\d.\s]+$/.test(rest.trim()))(folio?named:fallback).add(number);
  }
 }
 return named.size?named:fallback;
}
