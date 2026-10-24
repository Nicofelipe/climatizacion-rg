import {AuthUser} from '@/types/auth';
export interface SavedSession {user:AuthUser;token:string}
export function createSessionPersistence(adapter:{get:()=>Promise<string|null>;set:(value:string)=>Promise<void>;remove:()=>Promise<void>}){
 let writes=Promise.resolve();
 return {
  async load():Promise<SavedSession|null>{try{const raw=await adapter.get();if(!raw)return null;const value=JSON.parse(raw);if(!value||typeof value.token!=='string'||!value.token||!Number.isSafeInteger(value.user?.id)||value.user.id<=0||!Number.isSafeInteger(value.user?.companyId)||value.user.companyId<=0||!['ADMIN','EMPLOYEE'].includes(value.user?.role))return null;return value;}catch{return null;}},
  store(session:SavedSession|null){
   const operation=writes.catch(()=>{}).then(()=>{
    if(!session)return adapter.remove();
    const {id,companyId,firstName,lastName,email,role,passwordPolicy}=session.user;
    return adapter.set(JSON.stringify({token:session.token,user:{id,companyId,firstName,lastName,email,role,passwordPolicy}}));
   });writes=operation;return operation;
  },
 };
}
