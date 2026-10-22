// The preview runs one API process. A shared SQL lease/job queue is required
// before enabling multiple replicas. SQL's sync flag remains the fail-closed
// guard if this process stops during an operation.
const active=new Set<string>();
export function lockExpenseOperation(companyId:number,expenseId:number):(()=>void)|null{
  const key=`${companyId}:${expenseId}`;
  if(active.has(key))return null;
  active.add(key);let released=false;
  return ()=>{if(!released){released=true;active.delete(key);}};
}
