export function validExpenseFields(receipt:unknown,date:unknown,amount:number,description:unknown){
  return typeof receipt==='string'&&receipt.trim().length>0&&receipt.trim().length<=50
    &&typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))
    &&new Date(date).toISOString().slice(0,10)===date
    &&Number.isSafeInteger(amount)&&amount>0&&amount<=999999999
    &&(description===null||(typeof description==='string'&&description.length<=500));
}
