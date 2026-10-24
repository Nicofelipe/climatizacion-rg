/** Canonical Chilean RUT with verified modulus-11 check digit. */
export function normalizeRut(value:unknown):string|null {
  if(typeof value!=='string'||value.length>20||!/^[\d.kK\s-]+$/.test(value))return null;
  const raw=value.replace(/[.\s-]/g,'').toUpperCase();
  if(!/^[1-9]\d{6,7}[\dK]$/.test(raw))return null;
  const body=raw.slice(0,-1);let sum=0,factor=2;
  for(let i=body.length-1;i>=0;i--){sum+=Number(body[i])*factor;factor=factor===7?2:factor+1;}
  const remainder=11-sum%11,check=remainder===11?'0':remainder===10?'K':String(remainder);
  return raw.at(-1)===check?`${body}-${check}`:null;
}
