// Read-only audit. Never prints tokens, emails, file IDs or receipt data.
require('dotenv').config({quiet:true});require('tsx/cjs');
const {executeQuery}=require('../src/database/sqlServer.ts');
const {getGoogleDriveClient}=require('../src/services/googleDrive.service.ts');
(async()=>{
 const companies=await executeQuery("SELECT CompanyId FROM dbo.CompanyStorage WHERE IsActive=1 AND Provider=N'GOOGLE_DRIVE';",[]);
 for(const company of companies){
  const summary={companyId:company.CompanyId,checked:0,publicFiles:0,domainSharedFiles:0,namedCollaboratorGrants:0,unverified:0,complete:false};
  try{
   const {drive,storage}=await getGoogleDriveClient(company.CompanyId);
   const files=await executeQuery("SELECT TOP 201 ProviderFileId FROM dbo.[File] WHERE CompanyId=? AND Provider=N'GOOGLE_DRIVE' ORDER BY Id DESC;",[company.CompanyId]);
   const ids=[storage.RootFolderId,...files.slice(0,200).map(file=>file.ProviderFileId)];
   for(const id of new Set(ids)){
    try{
     let pageToken,publicAccess=false,domainAccess=false;
     do{
      const response=await drive.permissions.list({fileId:id,fields:'nextPageToken,permissions(type,role)',pageSize:100,pageToken});
      for(const permission of response.data.permissions??[]){if(permission.type==='anyone')publicAccess=true;if(permission.type==='domain')domainAccess=true;if(permission.type==='group'||(permission.type==='user'&&permission.role!=='owner'))summary.namedCollaboratorGrants++;}
      pageToken=response.data.nextPageToken;
     }while(pageToken);
     summary.checked++;if(publicAccess)summary.publicFiles++;if(domainAccess)summary.domainSharedFiles++;
    }catch{summary.unverified++;}
   }
   summary.complete=files.length<=200&&summary.unverified===0;
  }catch{summary.unverified++;}
  console.log(JSON.stringify(summary));
 }
})().catch(()=>{console.error('No fue posible completar la auditoría de permisos de Drive.');process.exitCode=1;});
