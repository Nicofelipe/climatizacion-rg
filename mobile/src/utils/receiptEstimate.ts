// Reference only: entirely taxable receipts at 19%, with no exemptions or other taxes.
export function estimateReceiptAmount(total:string,vat:string,expenseTypeId:number|null){
 if(expenseTypeId===2)return null;
 const valid=(value:string)=>/^\d+$/.test(value)&&Number(value)>0&&Number(value)<=999999999;
 if(valid(total)&&!vat)return {field:'vat' as const,value:String(Number(total)-Math.round(Number(total)/1.19)),note:'IVA estimado al 19%; revisado por el usuario.'};
 if(!total&&valid(vat)){const value=Math.round(Number(vat)*119/19);if(value<=999999999)return {field:'total' as const,value:String(value),note:'Total estimado desde IVA al 19%; revisado por el usuario.'};}
 return null;
}
