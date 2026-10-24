import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { executeQuery } from '../database/sqlServer';
import { normalizeRut } from '../utils/rut';

export async function listEmployeesController(req:AuthenticatedRequest,res:Response){
  if(!req.user||req.user.role!=='ADMIN'){res.sendStatus(403);return;}
  try{const employees=await executeQuery(`SELECT u.Id,u.FirstName,u.LastName,u.Email,u.Phone,u.Rut,u.IsActive,r.Name AS Role,
    (SELECT COUNT(*) FROM dbo.Expense e WHERE e.CompanyId=u.CompanyId AND e.UserId=u.Id AND e.IsDeleted=0) AS ReceiptCount,
    (SELECT COUNT(*) FROM dbo.Expense e WHERE e.CompanyId=u.CompanyId AND e.UserId=u.Id AND e.IsDeleted=0 AND e.Status=N'PENDING') AS PendingCount,
    (SELECT COUNT(*) FROM dbo.Expense e WHERE e.CompanyId=u.CompanyId AND e.UserId=u.Id AND e.IsDeleted=0 AND e.Status=N'APPROVED') AS ApprovedCount,
    (SELECT COUNT(*) FROM dbo.Expense e WHERE e.CompanyId=u.CompanyId AND e.UserId=u.Id AND e.IsDeleted=0 AND e.Status=N'REJECTED') AS RejectedCount
    FROM dbo.AppUser u JOIN dbo.Role r ON r.Id=u.RoleId
    WHERE u.CompanyId=? AND r.Name IN(N'EMPLOYEE',N'ADMIN') ORDER BY u.IsActive DESC,u.FirstName,u.LastName,u.Id;`,[req.user.companyId]);res.setHeader('Cache-Control','no-store');res.json({employees});}
  catch{res.status(500).json({message:'No fue posible cargar los trabajadores.'});}
}
export async function updateEmployeeController(req:AuthenticatedRequest,res:Response){
  if(!req.user||req.user.role!=='ADMIN'){res.sendStatus(403);return;}
  const id=Number(req.params.id),{firstName,lastName,email,phone,reason}=req.body;
  const rut=req.body.rut===undefined?undefined:normalizeRut(req.body.rut);
  if(rut===null){res.status(400).json({message:'Ingresa un RUT válido con dígito verificador.'});return;}
  if(!Number.isSafeInteger(id)||id<=0||typeof firstName!=='string'||!firstName.trim()||firstName.trim().length>100
    ||typeof lastName!=='string'||!lastName.trim()||lastName.trim().length>100||typeof email!=='string'||email.length>254
    ||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email.trim())||typeof phone!=='string'||phone.length>30
    ||typeof reason!=='string'||!reason.trim()||reason.length>1000){res.status(400).json({message:'Revisa nombre, apellido, correo, teléfono y motivo obligatorio.'});return;}
  try{await executeQuery(`SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY BEGIN TRANSACTION;
    IF NOT EXISTS(SELECT 1 FROM dbo.AppUser u JOIN dbo.Role r ON r.Id=u.RoleId WHERE u.Id=? AND u.CompanyId=? AND u.IsActive=1 AND r.Name=N'ADMIN' AND r.IsActive=1)
      THROW 50030,'EMPLOYEE_FORBIDDEN',1;
    DECLARE @Before nvarchar(max),@After nvarchar(max);
    SELECT @Before=(SELECT u.FirstName,u.LastName,u.Email,u.Phone,u.Rut FROM dbo.AppUser u WITH(UPDLOCK,HOLDLOCK) JOIN dbo.Role r ON r.Id=u.RoleId
      WHERE u.Id=? AND u.CompanyId=? AND r.Name=N'EMPLOYEE' AND u.IsActive=1 FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
    IF @Before IS NULL THROW 50031,'EMPLOYEE_NOT_FOUND',1;
    IF EXISTS(SELECT 1 FROM dbo.AppUser WITH(UPDLOCK,HOLDLOCK) WHERE Email=? AND Id<>?) THROW 50032,'EMPLOYEE_EMAIL_EXISTS',1;
    UPDATE dbo.AppUser SET FirstName=?,LastName=?,Email=?,Phone=?,Rut=COALESCE(?,Rut) WHERE Id=? AND CompanyId=?;
    SELECT @After=(SELECT FirstName,LastName,Email,Phone,Rut FROM dbo.AppUser WHERE Id=? AND CompanyId=? FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
    INSERT INTO dbo.AuditLog(CompanyId,UserId,Action,Entity,EntityId,BeforeData,AfterData,Reason,CreatedAt)
      VALUES(?,?,N'UPDATE_EMPLOYEE',N'APPUSER',?,@Before,@After,?,SYSUTCDATETIME());
    COMMIT TRANSACTION; SELECT 1 AS Updated;
    END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK TRANSACTION; THROW; END CATCH;
  `,[req.user.userId,req.user.companyId,id,req.user.companyId,email.trim().toLowerCase(),id,firstName.trim(),lastName.trim(),email.trim().toLowerCase(),phone.trim()||null,
    rut??null,id,req.user.companyId,id,req.user.companyId,req.user.companyId,req.user.userId,id,reason.trim()]);res.json({message:'Trabajador actualizado con historial. El cambio de correo se aplica al próximo inicio de sesión.'});}
  catch(err){const message=err instanceof Error?err.message:String(err);
    if(message.includes('EMPLOYEE_EMAIL_EXISTS')){res.status(409).json({message:'Ese correo ya está registrado.'});return;}
    if(message.includes('EMPLOYEE_NOT_FOUND')){res.sendStatus(404);return;}
    if(message.includes('EMPLOYEE_FORBIDDEN')){res.sendStatus(403);return;}
    res.status(500).json({message:'No fue posible actualizar el trabajador.'});}
}

export async function deactivateEmployeeController(req:AuthenticatedRequest,res:Response){
  if(!req.user||req.user.role!=='ADMIN'){res.sendStatus(403);return;}
  const id=Number(req.params.id),rut=normalizeRut(req.body?.rut),reason=req.body?.reason;
  if(!Number.isSafeInteger(id)||id<=0||!rut||typeof reason!=='string'||!reason.trim()||reason.length>1000){
    res.status(400).json({message:'Confirma el RUT válido del trabajador e indica el motivo de la baja.'});return;
  }
  if(id===req.user.userId){res.status(403).json({message:'No puedes dar de baja tu propia cuenta.'});return;}
  try{await executeQuery(`SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY BEGIN TRANSACTION;
    IF NOT EXISTS(SELECT 1 FROM dbo.AppUser u WITH(UPDLOCK,HOLDLOCK) JOIN dbo.Role r ON r.Id=u.RoleId
      WHERE u.Id=? AND u.CompanyId=? AND u.IsActive=1 AND r.Name=N'ADMIN' AND r.IsActive=1)
      THROW 50070,'DEACTIVATE_FORBIDDEN',1;
    DECLARE @Before nvarchar(max),@Rut nvarchar(12);
    SELECT @Rut=u.Rut,@Before=(SELECT u.Id,u.FirstName,u.LastName,u.Rut,u.IsActive FOR JSON PATH,WITHOUT_ARRAY_WRAPPER)
      FROM dbo.AppUser u WITH(UPDLOCK,HOLDLOCK) JOIN dbo.Role r ON r.Id=u.RoleId
      WHERE u.Id=? AND u.CompanyId=? AND r.Name=N'EMPLOYEE' AND u.IsActive=1;
    IF @Before IS NULL THROW 50071,'DEACTIVATE_NOT_FOUND',1;
    IF @Rut IS NULL OR @Rut<>? THROW 50072,'DEACTIVATE_RUT_MISMATCH',1;
    UPDATE dbo.AppUser SET IsActive=0,PasswordVersion=PasswordVersion+1 WHERE Id=? AND CompanyId=?;
    UPDATE dbo.PushDevice SET IsActive=0 WHERE UserId=? AND CompanyId=?;
    INSERT INTO dbo.AuditLog(CompanyId,UserId,Action,Entity,EntityId,BeforeData,AfterData,Reason,CreatedAt)
      VALUES(?,?,N'DEACTIVATE_EMPLOYEE',N'APPUSER',?,@Before,N'{"IsActive":false}',?,SYSUTCDATETIME());
    COMMIT TRANSACTION; SELECT 1 AS Deactivated;
    END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK TRANSACTION; THROW; END CATCH;
    `,[req.user.userId,req.user.companyId,id,req.user.companyId,rut,id,req.user.companyId,id,req.user.companyId,
      req.user.companyId,req.user.userId,id,reason.trim()]);
    res.json({message:'Trabajador dado de baja. Su acceso y notificaciones quedan bloqueados; las boletas y su historial se conservan.'});
  }catch(error){const message=error instanceof Error?error.message:'';
    if(message.includes('DEACTIVATE_RUT_MISMATCH')){res.status(409).json({message:'El RUT no coincide. Si falta registrarlo, edita primero al trabajador.'});return;}
    if(message.includes('DEACTIVATE_NOT_FOUND')){res.sendStatus(404);return;}
    if(message.includes('DEACTIVATE_FORBIDDEN')){res.sendStatus(403);return;}
    res.status(500).json({message:'No fue posible dar de baja al trabajador. No se confirmó ningún cambio.'});
  }
}
