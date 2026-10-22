// Additive local migration; never changes receipt values or existing audit entries.
require('dotenv').config({quiet:true});require('tsx/cjs');
const fs=require('node:fs');const {executeQuery}=require('../src/database/sqlServer.ts');
executeQuery(fs.readFileSync('../database/migrations/015_ExpenseCorrections.sql','utf8'))
 .then(()=>console.log('Migration 015 applied.')).catch(error=>{console.error(error.message);process.exitCode=1;});
