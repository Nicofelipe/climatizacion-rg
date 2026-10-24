require('dotenv').config({quiet:true});require('tsx/cjs');
const fs=require('node:fs'),path=require('node:path');
const {executeQuery}=require('../src/database/sqlServer.ts');
executeQuery(fs.readFileSync(path.resolve(__dirname,'../../database/migrations/021_EmployeeRut.sql'),'utf8'))
 .then(()=>console.log('Migración 021 aplicada. No se modificaron cuentas ni boletas.'))
 .catch(()=>{console.error('No fue posible aplicar la migración 021.');process.exitCode=1;});
