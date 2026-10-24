require('dotenv').config({quiet:true});require('tsx/cjs');
const fs=require('node:fs');const {executeQuery}=require('../src/database/sqlServer.ts');
executeQuery(fs.readFileSync('../database/migrations/017_InitialPasswordPolicy.sql','utf8')).then(()=>console.log('Migration 017 applied.')).catch(error=>{console.error(error.message);process.exitCode=1;});
