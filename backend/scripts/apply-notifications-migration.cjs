require('dotenv').config({quiet:true});require('tsx/cjs');
const fs=require('node:fs');const {executeQuery}=require('../src/database/sqlServer.ts');
executeQuery(fs.readFileSync('../database/migrations/019_Notifications.sql','utf8')).then(()=>console.log('Migration 019 applied.')).catch(()=>{console.error('No fue posible aplicar la migración de notificaciones.');process.exitCode=1;});
