import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { executeQuery } from '../database/sqlServer';

export async function listEmployeesController(req:AuthenticatedRequest,res:Response){
  if(!req.user||req.user.role!=='ADMIN'){res.sendStatus(403);return;}
  try{const employees=await executeQuery(`SELECT u.Id,u.FirstName,u.LastName,u.Email,u.Phone FROM dbo.AppUser u JOIN dbo.Role r ON r.Id=u.RoleId
    WHERE u.CompanyId=? AND r.Name=N'EMPLOYEE' AND u.IsActive=1 ORDER BY u.FirstName,u.LastName,u.Id;`,[req.user.companyId]);res.setHeader('Cache-Control','no-store');res.json({employees});}
  catch{res.status(500).json({message:'No fue posible cargar los trabajadores.'});}
}
export async function updateEmployeeController(req:AuthenticatedRequest,res:Response){
  if(!req.user||req.user.role!=='ADMIN'){res.sendStatus(403);return;}
  const id=Number(req.params.id),{firstName,lastName,email,phone,reason}=req.body;
  if(!Number.isSafeInteger(id)||id<=0||typeof firstName!=='string'||!firstName.trim()||firstName.trim().length>100
    ||typeof lastName!=='string'||!lastName.trim()||lastName.trim().length>100||typeof email!=='string'||email.length>254
    ||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email.trim())||typeof phone!=='string'||phone.length>30
    ||typeof reason!=='string'||!reason.trim()||reason.length>1000){res.status(400).json({message:'Revisa nombre, apellido, correo, teléfono y motivo obligatorio.'});return;}
  try{await executeQuery(`SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY BEGIN TRANSACTION;
    IF NOT EXISTS(SELECT 1 FROM dbo.AppUser u JOIN dbo.Role r ON r.Id=u.RoleId WHERE u.Id=? AND u.CompanyId=? AND u.IsActive=1 AND r.Name=N'ADMIN' AND r.IsActive=1)
      THROW 50030,'EMPLOYEE_FORBIDDEN',1;
    DECLARE @Before nvarchar(max),@After nvarchar(max);
    SELECT @Before=(SELECT u.FirstName,u.LastName,u.Email,u.Phone FROM dbo.AppUser u WITH(UPDLOCK,HOLDLOCK) JOIN dbo.Role r ON r.Id=u.RoleId
      WHERE u.Id=? AND u.CompanyId=? AND r.Name=N'EMPLOYEE' AND u.IsActive=1 FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
    IF @Before IS NULL THROW 50031,'EMPLOYEE_NOT_FOUND',1;
    IF EXISTS(SELECT 1 FROM dbo.AppUser WITH(UPDLOCK,HOLDLOCK) WHERE Email=? AND Id<>?) THROW 50032,'EMPLOYEE_EMAIL_EXISTS',1;
    UPDATE dbo.AppUser SET FirstName=?,LastName=?,Email=?,Phone=? WHERE Id=? AND CompanyId=?;
    SELECT @After=(SELECT FirstName,LastName,Email,Phone FROM dbo.AppUser WHERE Id=? AND CompanyId=? FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
    INSERT INTO dbo.AuditLog(CompanyId,UserId,Action,Entity,EntityId,BeforeData,AfterData,Reason,CreatedAt)
      VALUES(?,?,N'UPDATE_EMPLOYEE',N'APPUSER',?,@Before,@After,?,SYSUTCDATETIME());
    COMMIT TRANSACTION; SELECT 1 AS Updated;
    END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK TRANSACTION; THROW; END CATCH;
  `,[req.user.userId,req.user.companyId,id,req.user.companyId,email.trim().toLowerCase(),id,firstName.trim(),lastName.trim(),email.trim().toLowerCase(),phone.trim()||null,
    id,req.user.companyId,id,req.user.companyId,req.user.companyId,req.user.userId,id,reason.trim()]);res.json({message:'Trabajador actualizado con historial. El cambio de correo se aplica al próximo inicio de sesión.'});}
  catch(err){const message=err instanceof Error?err.message:String(err);
    if(message.includes('EMPLOYEE_EMAIL_EXISTS')){res.status(409).json({message:'Ese correo ya está registrado.'});return;}
    if(message.includes('EMPLOYEE_NOT_FOUND')){res.sendStatus(404);return;}
    if(message.includes('EMPLOYEE_FORBIDDEN')){res.sendStatus(403);return;}
    res.status(500).json({message:'No fue posible actualizar el trabajador.'});}
}
