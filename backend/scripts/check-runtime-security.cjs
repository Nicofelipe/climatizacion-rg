require('dotenv').config({quiet:true});require('tsx/cjs');
const {executeQuery}=require('../src/database/sqlServer.ts');
(async()=>{
 const [privileges]=await executeQuery("SELECT IS_SRVROLEMEMBER('sysadmin') AS isSysadmin,IS_MEMBER('db_owner') AS isDatabaseOwner,CONVERT(int,SERVERPROPERTY('IsIntegratedSecurityOnly')) AS windowsAuthenticationOnly;",[]);
 console.log(JSON.stringify({node:process.version,...privileges,
   jwtSecretAtLeast32Bytes:Buffer.byteLength(process.env.JWT_SECRET??'')>=32,
   storageEncryptionKeyValid:/^[a-f0-9]{64}$/i.test(process.env.STORAGE_ENCRYPTION_KEY??'')}));
})().catch(()=>{console.error('No fue posible comprobar los privilegios SQL.');process.exitCode=1;});
