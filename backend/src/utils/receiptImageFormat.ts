export function receiptImageMime(bytes:Buffer):string|null{
  if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
  if(bytes.length>=8&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';
  if(['GIF87a','GIF89a'].includes(bytes.subarray(0,6).toString('ascii')))return 'image/gif';
  if(bytes.length>=12&&bytes.subarray(0,4).toString('ascii')==='RIFF'&&bytes.subarray(8,12).toString('ascii')==='WEBP')return 'image/webp';
  if(bytes.length>=16&&bytes.subarray(4,8).toString('ascii')==='ftyp'){
    const brands=[bytes.subarray(8,12).toString('ascii')];
    for(let i=16;i+4<=bytes.length;i+=4)brands.push(bytes.subarray(i,i+4).toString('ascii'));
    if(brands.some(brand=>['heic','heix','hevc','hevx'].includes(brand)))return 'image/heic';
    if(brands.some(brand=>['mif1','msf1'].includes(brand)))return 'image/heif';
  }
  return null;
}
