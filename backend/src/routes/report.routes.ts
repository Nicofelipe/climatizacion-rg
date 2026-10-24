import {Router} from 'express';
import {authenticateToken,AuthenticatedRequest} from '../middlewares/auth.middleware';
import {requireRole} from '../middlewares/role.middleware';
import {fixedWindowLimit} from '../middlewares/security.middleware';
import {getExpenses} from '../services/expense.service';
import {buildExpenseWorkbook,reportPeriod} from '../services/expenseReport.service';
import {executeQuery} from '../database/sqlServer';
const router=Router();
router.get('/expenses',authenticateToken,requireRole('ADMIN'),fixedWindowLimit(10,300000,req=>{
 const user=(req as AuthenticatedRequest).user!;return `${user.companyId}:${user.userId}`;
}),async(req:AuthenticatedRequest,res)=>{
 try{
  const period=reportPeriod(req.query.year,req.query.month),scope=req.query.scope??'company';
  if(scope!=='personal'&&scope!=='company'){res.status(400).json({message:'Selecciona un alcance válido.'});return;}
  const user=req.user!;
  const rows=await getExpenses(user.companyId,user.userId,scope==='company'?'ADMIN':'EMPLOYEE');
  const companies=await executeQuery<{Name:string}>('SELECT Name FROM dbo.Company WHERE Id=? AND IsActive=1;',[user.companyId]);
  if(!companies[0]){res.sendStatus(404);return;}
  const report=await buildExpenseWorkbook(rows,period,scope,companies[0].Name);
  res.json({filename:`BOLETAS_${period.prefix}_${scope==='company'?'EMPRESA':'PERSONALES'}.xlsx`,mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',base64:report.buffer.toString('base64'),count:report.count});
 }catch(error){
  const code=error instanceof Error?error.message:'';
  res.status(code==='REPORT_PERIOD_INVALID'?400:code==='REPORT_TOO_LARGE'?413:503).json({message:code==='REPORT_PERIOD_INVALID'?'Selecciona un año y un mes válidos.':code==='REPORT_TOO_LARGE'?'El reporte supera 20.000 boletas. Descarga períodos mensuales.':'No fue posible generar el Excel. Inténtalo nuevamente.'});
 }
});
export default router;
