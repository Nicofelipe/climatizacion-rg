require('dotenv').config({quiet:true});require('tsx/cjs');
const fs=require('node:fs');const {executeQuery}=require('../src/database/sqlServer.ts');
executeQuery(fs.readFileSync('../database/migrations/016_GoogleLogin.sql','utf8')).then(()=>console.log('Migration 016 applied.')).catch(error=>{console.error(error.message);process.exitCode=1;});
