// Read-only reports and an intentionally incomplete upload, rejected before any expense write.
require('dotenv').config({quiet:true});require('tsx/cjs');
const {executeQuery}=require('../src/database/sqlServer.ts');
const {generateAccessToken}=require('../src/services/token.service.ts');
(async()=>{
 const [u]=await executeQuery("SELECT TOP 1 u.Id,u.CompanyId,u.PasswordVersion FROM dbo.AppUser u JOIN dbo.Role r ON r.Id=u.RoleId WHERE u.IsActive=1 AND r.Name=N'ADMIN' ORDER BY u.Id",[]);
 if(!u)throw new Error('No test administrator');
 const token=generateAccessToken({userId:u.Id,companyId:u.CompanyId,passwordVersion:u.PasswordVersion,role:'ADMIN'});
 const base=process.env.PREVIEW_API_URL;if(!base?.startsWith('https://'))throw new Error('Missing HTTPS test API');
 for(const suffix of ['year=2026&month=10','year=2026']){
  const response=await fetch(base+'/reports/expenses?'+suffix,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(30000)});
  const body=await response.json();const valid=Boolean(body.base64&&Buffer.from(body.base64,'base64').subarray(0,2).toString()==='PK');
  console.log('Report',response.status,body.filename,'valid XLSX:',valid);if(!response.ok||!valid)throw new Error('Report failed');
 }
 const form=new FormData();for(const [key,value] of Object.entries({expenseTypeId:'1',receiptNumber:'DIAGNOSTIC-NOT-SAVED',expenseDate:'2026-10-22',totalAmount:'100'}))form.append(key,value);
 const rejected=await fetch(base+'/expenses',{method:'POST',headers:{Authorization:'Bearer '+token},body:form,signal:AbortSignal.timeout(15000)});
 const body=await rejected.json();console.log('Incomplete multipart upload',rejected.status,body.message);
 if(rejected.status!==400||!String(body.message).includes('imagen'))throw new Error('Unexpected incomplete-upload response');
 if(process.env.VERIFY_CLOSED_PHOTO==='1'){
  const {convertFormDataAsync}=require('../../mobile/node_modules/expo/src/winter/fetch/convertFormData.ts');
  const photo=new FormData();
  for(const [key,value] of Object.entries({expenseTypeId:'1',receiptNumber:'DIAGNOSTIC-NOT-SAVED',expenseDate:'2020-01-01',totalAmount:'100'}))photo.append(key,value);
  photo.append('image',new Blob([Uint8Array.from([137,80,78,71,13,10,26,10,0,255])],{type:'image/png'}),'fixture.png');
  const encoded=await convertFormDataAsync(photo,'rg-diagnostic-boundary');
  const response=await fetch(base+'/expenses',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'multipart/form-data; boundary='+encoded.boundary},body:encoded.body,signal:AbortSignal.timeout(15000)});
  const result=await response.json();
  console.log('Expo-encoded photo reached closed-year validation:',response.status,String(result.message));
  if(response.status!==400||!String(result.message).includes('año'))throw new Error('Photo transport verification failed');
 }
})().catch(()=>{console.error('Endpoint verification failed');process.exitCode=1;});
