require('dotenv').config({quiet:true});require('tsx/cjs');
const {executeQuery}=require('../src/database/sqlServer.ts');
const {generateAccessToken}=require('../src/services/token.service.ts');
(async()=>{
 const start=Date.now();
 const [account]=await executeQuery(`SELECT TOP 1 u.Id,u.CompanyId,u.PasswordVersion FROM dbo.AppUser u JOIN dbo.Role r ON r.Id=u.RoleId JOIN dbo.Company c ON c.Id=u.CompanyId WHERE u.IsActive=1 AND c.IsActive=1 AND r.IsActive=1 AND r.Name=N'ADMIN' ORDER BY u.Id;`);
 console.log('SQL account lookup',Date.now()-start,'ms');if(!account)throw new Error('No active test administrator');
 const token=generateAccessToken({userId:account.Id,companyId:account.CompanyId,role:'ADMIN',passwordVersion:account.PasswordVersion});
 for(const base of ['http://127.0.0.1:3000/api',...(process.env.PREVIEW_API_URL?[process.env.PREVIEW_API_URL]:[])]){
  for(const path of ['/dashboard?month=2026-10&scope=personal','/dashboard?month=2026-10&scope=company','/users','/expenses','/notifications']){
   const at=Date.now();try{const response=await fetch(base+path,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(35000)});const body=await response.arrayBuffer();console.log(base.startsWith('http://')?'local':'tunnel',path,response.status,Date.now()-at,'ms',body.byteLength,'bytes');}catch(error){console.log('request failed',path,error.name,Date.now()-at,'ms');}
  }
 }
})().catch(()=>{console.error('Measurement could not finish');process.exitCode=1;});
