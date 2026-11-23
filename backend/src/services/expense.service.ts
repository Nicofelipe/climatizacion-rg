import { executeQuery, QueryParam } from '../database/sqlServer';
import { ReceiptTax, receiptTax, VatSource } from '../utils/receiptTax';
import { cleanReceiptNumber, receiptKey } from '../utils/receiptKey';
import { validateSupplier } from './supplier.service';

export type DocumentType = 'BOLETA' | 'FACTURA';

export interface ExpenseInput {
  companyId: number;
  userId: number;
  expenseTypeId: number;
  supplierId?: number | null;
  documentType?: DocumentType;
  receiptNumber: string;
  expenseDate: string;
  totalAmount: number;
  vatSource?: VatSource;
  vatAmount?: number | null;
  description?: string | null;
}

export interface CreatedExpenseRow {
  Id: number; CompanyId: number; UserId: number; ExpenseTypeId: number; SupplierId: number | null;
  ReceiptNumber: string; ExpenseDate: string; NetAmount: number; VatAmount: number; TotalAmount: number;
  VatSource: VatSource; DocumentType: DocumentType; Description: string | null; Status: string; CreatedAt: string;
}

export interface ExpenseListRow extends CreatedExpenseRow {
  UserName: string; ExpenseTypeName: string; SupplierName: string | null; SupplierRut: string | null;
  RejectionReason: string | null;
}

interface ExpenseDetailRow extends ExpenseListRow {
  CanReview: boolean; DriveSyncPending: boolean; ReviewedAt: string | null; ReviewedByName: string | null;
  SimilarCount: number;
  FileId: number | null; FileProvider: string | null; FileProviderFileId: string | null;
  FileOriginalName: string | null; FileMimeType: string | null; FileSize: number | null;
}

const taxOf = (input: ExpenseInput): ReceiptTax => receiptTax(input.totalAmount, input.vatSource ?? 'CALCULATED', input.vatAmount);

/** Regla de IVA del tipo de gasto; rechaza tipos inexistentes o desactivados. */
export async function expenseTypeVatDefault(expenseTypeId: number): Promise<VatSource> {
  const rows = await executeQuery<{ VatDefault: VatSource }>('SELECT VatDefault FROM dbo.ExpenseType WHERE Id=? AND IsActive=1;', [expenseTypeId]);
  if (!rows[0]) throw new Error('INVALID_EXPENSE_TYPE');
  return rows[0].VatDefault;
}

/**
 * Una boleta ya está rendida si la empresa tiene otra vigente con el mismo tipo y número, del mismo comercio.
 * Si alguna no tiene comercio registrado, basta que coincida la fecha o el total. Se evalúa con bloqueo dentro
 * de la misma transacción que escribe, así dos envíos simultáneos no pueden duplicarla.
 */
const duplicateCheck = `
      IF EXISTS(SELECT 1 FROM dbo.Expense d WITH(UPDLOCK,HOLDLOCK)
        WHERE d.CompanyId=@Company AND d.ReceiptKey=@Key AND d.DocumentType=@Document AND d.Id<>@Self
          AND d.Status<>N'REJECTED' AND d.IsDeleted=0
          AND (d.SupplierId=@Supplier OR ((d.SupplierId IS NULL OR @Supplier IS NULL) AND (d.ExpenseDate=@Date OR d.TotalAmount=@Total))))
        THROW 50100,'RECEIPT_NUMBER_ALREADY_EXISTS',1;`;

const snapshotColumns = 'ExpenseDate,TotalAmount,NetAmount,VatAmount,VatSource,Status,ExpenseTypeId,SupplierId,DocumentType,ReceiptNumber,Description';

export async function createExpense(input: ExpenseInput): Promise<CreatedExpenseRow> {
  await validateSupplier(input.companyId, input.supplierId);
  const tax = taxOf(input);
  const rows = await executeQuery<CreatedExpenseRow>(`
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
      BEGIN TRANSACTION;
      DECLARE @Company int=?,@Self int=0,@Key nvarchar(50)=?,@Document nvarchar(10)=?,@Supplier int=?,@Date date=?,@Total decimal(18,2)=?;
      DECLARE @Created TABLE(Id int);
      ${duplicateCheck}
      INSERT INTO dbo.Expense(CompanyId,UserId,ExpenseTypeId,SupplierId,DocumentType,ReceiptNumber,ExpenseDate,Currency,
        TaxRate,NetAmount,VatAmount,VatSource,TotalAmount,Description,Status,DriveSyncPending)
      OUTPUT INSERTED.Id INTO @Created
      VALUES(@Company,?,?,@Supplier,@Document,?,@Date,'CLP',?,?,?,?,@Total,?,N'PENDING',1);
      COMMIT TRANSACTION;
      SELECT e.Id,e.CompanyId,e.UserId,e.ExpenseTypeId,e.SupplierId,e.DocumentType,e.ReceiptNumber,e.ExpenseDate,
        e.NetAmount,e.VatAmount,e.VatSource,e.TotalAmount,e.Description,e.Status,e.CreatedAt
      FROM dbo.Expense e JOIN @Created c ON c.Id=e.Id;
    END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK TRANSACTION; THROW; END CATCH;`,
    [input.companyId, receiptKey(input.receiptNumber), input.documentType ?? 'BOLETA', input.supplierId ?? null,
      input.expenseDate, input.totalAmount, input.userId, input.expenseTypeId, cleanReceiptNumber(input.receiptNumber),
      tax.taxRate, tax.net, tax.vat, tax.source, input.description ?? null]);
  return rows[0];
}

export async function finishExpenseSync(companyId: number, expenseId: number) {
  await executeQuery(`SET XACT_ABORT ON; BEGIN TRY BEGIN TRANSACTION;
    DECLARE @Expense int=?,@Company int=?;
    UPDATE dbo.Expense SET DriveSyncPending=0 WHERE Id=@Expense AND CompanyId=@Company AND IsDeleted=0 AND Status=N'PENDING'
    AND EXISTS(SELECT 1 FROM dbo.[File] f WHERE f.CompanyId=dbo.Expense.CompanyId AND f.EntityId=dbo.Expense.Id AND f.EntityType=N'EXPENSE');
    IF @@ROWCOUNT<>1 THROW 50091,'EXPENSE_SYNC_CONFLICT',1;
    INSERT INTO dbo.UserNotification(CompanyId,UserId,ExpenseId,Kind,EventKey)
      SELECT @Company,u.Id,e.Id,N'PENDING_REVIEW',CONCAT(N'CREATED:',e.Id) FROM dbo.AppUser u JOIN dbo.Role r ON r.Id=u.RoleId
      JOIN dbo.Expense e ON e.CompanyId=u.CompanyId AND e.Id=@Expense
      WHERE u.CompanyId=@Company AND u.IsActive=1 AND r.IsActive=1 AND r.Name=N'ADMIN' AND u.Id<>e.UserId
       AND NOT EXISTS(SELECT 1 FROM dbo.UserNotification WITH(UPDLOCK,HOLDLOCK) WHERE CompanyId=@Company AND UserId=u.Id AND EventKey=CONCAT(N'CREATED:',e.Id));
    COMMIT TRANSACTION; END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK TRANSACTION; THROW; END CATCH;`, [expenseId, companyId]);
}

const listColumns = `e.Id,e.UserId,owner.FirstName+N' '+owner.LastName AS UserName,e.DocumentType,e.ReceiptNumber,e.ExpenseDate,
        e.ExpenseTypeId,et.Name AS ExpenseTypeName,e.SupplierId,s.Name AS SupplierName,s.Rut AS SupplierRut,
        e.NetAmount,e.VatAmount,e.VatSource,e.TotalAmount,e.Description,e.Status,e.CreatedAt,e.RejectionReason`;
const listJoins = `FROM dbo.Expense AS e
      INNER JOIN dbo.AppUser owner ON owner.Id=e.UserId AND owner.CompanyId=e.CompanyId
      INNER JOIN dbo.ExpenseType AS et ON et.Id=e.ExpenseTypeId
      LEFT JOIN dbo.Supplier AS s ON s.Id=e.SupplierId AND s.CompanyId=e.CompanyId`;

/** Todas las boletas del alcance. `range` limita por fecha de la boleta (ambos extremos incluidos). */
export async function getExpenses(companyId: number, userId: number, role: string, range?: { from: string; to: string }) {
  return executeQuery<ExpenseListRow>(`
      SELECT ${listColumns}
      ${listJoins}
      WHERE e.CompanyId=? AND e.IsDeleted=0 AND (?=1 OR e.UserId=?)${range ? ' AND e.ExpenseDate>=? AND e.ExpenseDate<=?' : ''}
      ORDER BY e.ExpenseDate DESC,e.Id DESC;`,
    [companyId, role === 'ADMIN' ? 1 : 0, userId, ...(range ? [range.from, range.to] : [])]);
}

export async function countPending(companyId: number, userId: number, role: string) {
  const rows = await executeQuery<{ Total: number }>(`SELECT COUNT(*) AS Total FROM dbo.Expense
    WHERE CompanyId=? AND IsDeleted=0 AND Status=N'PENDING' AND (?=1 OR UserId=?);`, [companyId, role === 'ADMIN' ? 1 : 0, userId]);
  return rows[0]?.Total ?? 0;
}

export interface ExpenseSearch {
  companyId: number; userId: number; role: string;
  scope: 'company' | 'personal'; workerId?: number; status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  text?: string; from?: string; to?: string; expenseTypeId?: number;
  /** Solo pendientes que esta persona puede revisar. */
  reviewable?: boolean;
  page: number; pageSize: number;
}

/** Listado por páginas, con los totales de cada estado para el mismo filtro. */
export async function searchExpenses(input: ExpenseSearch) {
  const where = ['e.CompanyId=?', 'e.IsDeleted=0'];
  const params: QueryParam[] = [input.companyId];
  const add = (condition: string, ...values: QueryParam[]) => { where.push(condition); params.push(...values); };
  if (input.role !== 'ADMIN' || input.scope === 'personal') add('e.UserId=?', input.userId);
  else if (input.workerId) add('e.UserId=?', input.workerId);
  if (input.from) add('e.ExpenseDate>=?', input.from);
  if (input.to) add('e.ExpenseDate<=?', input.to);
  if (input.expenseTypeId) add('e.ExpenseTypeId=?', input.expenseTypeId);
  if (input.text) {
    const like = `%${input.text.replace(/[[%_]/g, '[$&]')}%`;
    // Sin distinguir tildes ni mayúsculas. El RUT se compara con y sin puntos.
    const rut = `%${input.text.replace(/[.\s]/g, '').replace(/[[%_]/g, '[$&]')}%`;
    add(`(e.ReceiptNumber LIKE ? OR s.Rut LIKE ? OR (CONCAT(et.Name,N' ',s.Name,N' ',owner.FirstName,N' ',owner.LastName,N' ',e.Description) COLLATE Latin1_General_CI_AI LIKE ?))`,
      like, rut, like);
  }
  if (input.reviewable) {
    add(`e.Status=N'PENDING' AND e.DriveSyncPending=0 AND (e.UserId<>? OR (SELECT COUNT(*) FROM dbo.AppUser a JOIN dbo.Role ar ON ar.Id=a.RoleId
      WHERE a.CompanyId=e.CompanyId AND a.IsActive=1 AND ar.Name=N'ADMIN' AND ar.IsActive=1)=1)`, input.userId);
  }
  const totals = await executeQuery<{ Status: string; Total: number; Amount: number }>(`
    SELECT e.Status,COUNT(*) AS Total,SUM(e.TotalAmount) AS Amount ${listJoins} WHERE ${where.join(' AND ')} GROUP BY e.Status;`, params);
  if (input.status) add('e.Status=?', input.status);
  const rows = await executeQuery<ExpenseListRow>(`
    SELECT ${listColumns} ${listJoins} WHERE ${where.join(' AND ')}
    ORDER BY e.ExpenseDate DESC,e.Id DESC OFFSET ? ROWS FETCH NEXT ? ROWS ONLY;`,
    [...params, (input.page - 1) * input.pageSize, input.pageSize]);
  const states = (['PENDING', 'APPROVED', 'REJECTED'] as const).map(status => {
    const row = totals.find(item => item.Status === status);
    return { status, count: row?.Total ?? 0, amount: Number(row?.Amount ?? 0) };
  });
  const total = states.filter(item => !input.status || item.status === input.status).reduce((sum, item) => sum + item.count, 0);
  return { expenses: rows, states, total, page: input.page, pageSize: input.pageSize };
}

export async function getExpenseById(companyId: number, expenseId: number, userId: number, role: string) {
  const rows = await executeQuery<ExpenseDetailRow>(`
      SELECT ${listColumns},
        CAST(CASE WHEN e.UserId<>? OR (SELECT COUNT(*) FROM dbo.AppUser approver JOIN dbo.Role ar ON ar.Id=approver.RoleId
          WHERE approver.CompanyId=e.CompanyId AND approver.IsActive=1 AND ar.Name=N'ADMIN' AND ar.IsActive=1)=1 THEN 1 ELSE 0 END AS bit) AS CanReview,
        e.ReviewedAt,e.DriveSyncPending,reviewer.FirstName+N' '+reviewer.LastName AS ReviewedByName,
        (SELECT COUNT(*) FROM dbo.Expense o WHERE o.CompanyId=e.CompanyId AND o.Id<>e.Id AND o.IsDeleted=0 AND o.Status<>N'REJECTED'
          AND (o.ReceiptKey=e.ReceiptKey OR (o.UserId=e.UserId AND o.ExpenseDate=e.ExpenseDate AND o.TotalAmount=e.TotalAmount))) AS SimilarCount,
        f.Id AS FileId,f.Provider AS FileProvider,f.ProviderFileId AS FileProviderFileId,f.OriginalFileName AS FileOriginalName,
        f.MimeType AS FileMimeType,f.FileSize AS FileSize
      ${listJoins}
      LEFT JOIN dbo.[File] AS f ON f.EntityType=N'EXPENSE' AND f.EntityId=e.Id AND f.CompanyId=e.CompanyId
      LEFT JOIN dbo.AppUser AS reviewer ON reviewer.Id=e.ReviewedByUserId AND reviewer.CompanyId=e.CompanyId
      WHERE e.Id=? AND e.CompanyId=? AND e.IsDeleted=0 AND (?=1 OR e.UserId=?);`,
    [userId, expenseId, companyId, role === 'ADMIN' ? 1 : 0, userId]);
  const row = rows[0];
  if (!row) return null;
  const { FileId, FileProvider, FileProviderFileId, FileOriginalName, FileMimeType, FileSize, SimilarCount, ...expense } = row;
  return {
    ...expense,
    CanReview: role === 'ADMIN' && row.CanReview,
    // Aviso solo para quien revisa: no revela boletas ajenas al trabajador.
    SimilarCount: role === 'ADMIN' ? SimilarCount : 0,
    file: FileId ? {
      Id: FileId, Provider: FileProvider, ProviderFileId: FileProviderFileId,
      OriginalFileName: FileOriginalName, MimeType: FileMimeType, FileSize,
    } : null,
  };
}

export interface UpdateExpenseInput extends ExpenseInput { role: string; expenseId: number }

export async function updateExpense(input: UpdateExpenseInput) {
  await validateSupplier(input.companyId, input.supplierId);
  const tax = taxOf(input);
  const rows = await executeQuery<CreatedExpenseRow>(`
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
      BEGIN TRANSACTION;
      DECLARE @Company int=?,@Self int=?,@Key nvarchar(50)=?,@Document nvarchar(10)=?,@Supplier int=?,@Date date=?,@Total decimal(18,2)=?;
      DECLARE @Before nvarchar(max),@After nvarchar(max),@ChangedId int;
      ${duplicateCheck}
      SELECT @Before=(SELECT ${snapshotColumns} FROM dbo.Expense WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Self AND CompanyId=@Company FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
      UPDATE dbo.Expense SET ExpenseTypeId=?,SupplierId=@Supplier,DocumentType=@Document,ReceiptNumber=?,ExpenseDate=@Date,
        TaxRate=?,NetAmount=?,VatAmount=?,VatSource=?,TotalAmount=@Total,Description=?,DriveSyncPending=1,UpdatedAt=SYSDATETIME()
      WHERE Id=@Self AND CompanyId=@Company AND IsDeleted=0 AND Status=N'PENDING' AND DriveSyncPending=0 AND UserId=?;
      IF @@ROWCOUNT>0
      BEGIN
        SET @ChangedId=@Self;
        SELECT @After=(SELECT ${snapshotColumns} FROM dbo.Expense WHERE Id=@ChangedId FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
        INSERT INTO dbo.AuditLog(CompanyId,UserId,Action,Entity,EntityId,BeforeData,AfterData,CreatedAt)
          VALUES(@Company,?,N'UPDATE_EXPENSE',N'EXPENSE',@ChangedId,@Before,@After,SYSUTCDATETIME());
      END;
      COMMIT TRANSACTION;
      SELECT * FROM dbo.Expense WHERE Id=@ChangedId;
    END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK TRANSACTION; THROW; END CATCH;`,
    [input.companyId, input.expenseId, receiptKey(input.receiptNumber), input.documentType ?? 'BOLETA', input.supplierId ?? null,
      input.expenseDate, input.totalAmount, input.expenseTypeId, cleanReceiptNumber(input.receiptNumber),
      tax.taxRate, tax.net, tax.vat, tax.source, input.description ?? null, input.userId, input.userId]);
  return rows[0] ?? null;
}

export async function deleteExpense(companyId: number, expenseId: number, userId: number, _role: string) {
  const rows = await executeQuery<{ Id: number }>(`SET NOCOUNT ON; SET XACT_ABORT ON; BEGIN TRY BEGIN TRANSACTION;
      DECLARE @Deleted TABLE(Id int);
      UPDATE dbo.Expense SET IsDeleted=1,UpdatedAt=SYSDATETIME() OUTPUT INSERTED.Id INTO @Deleted
      WHERE Id=? AND CompanyId=? AND IsDeleted=0 AND Status=N'PENDING' AND DriveSyncPending=0 AND UserId=?;
      INSERT INTO dbo.AuditLog(CompanyId,UserId,Action,Entity,EntityId,Reason,CreatedAt)
        SELECT ?,?,N'SOFT_DELETE_EXPENSE',N'EXPENSE',Id,N'Boleta pendiente retirada del listado; registro e imagen conservados.',SYSUTCDATETIME() FROM @Deleted;
      COMMIT TRANSACTION; SELECT Id FROM @Deleted;
      END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK TRANSACTION; THROW; END CATCH;`,
    [expenseId, companyId, userId, companyId, userId]);
  return rows[0] ?? null;
}

export async function rollbackCreatedExpense(companyId: number, expenseId: number) {
  await executeQuery(`DELETE FROM dbo.Expense WHERE Id=? AND CompanyId=? AND Status=N'PENDING' AND DriveSyncPending=1;`, [expenseId, companyId]);
}

/** Valores anteriores a una edición que no se pudo completar; se restauran tal cual, sin recalcular. */
export interface ExpenseRestore {
  companyId: number; expenseId: number; expenseTypeId: number; supplierId?: number | null; documentType: DocumentType;
  receiptNumber: string; expenseDate: string; netAmount: number; vatAmount: number; vatSource: VatSource;
  totalAmount: number; description?: string | null;
}

export async function rollbackUpdatedExpense(input: ExpenseRestore) {
  await executeQuery(`
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
      BEGIN TRANSACTION;
      DECLARE @Id int=?,@Company int=?;
      DECLARE @Before nvarchar(max),@After nvarchar(max);
      SELECT @Before=(SELECT ${snapshotColumns} FROM dbo.Expense WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND CompanyId=@Company FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
      UPDATE dbo.Expense SET ExpenseTypeId=?,SupplierId=?,DocumentType=?,ReceiptNumber=?,ExpenseDate=?,TaxRate=?,NetAmount=?,VatAmount=?,
        VatSource=?,TotalAmount=?,Description=?,DriveSyncPending=0,UpdatedAt=SYSDATETIME()
      WHERE Id=@Id AND CompanyId=@Company AND IsDeleted=0 AND Status=N'PENDING' AND DriveSyncPending=1;
      IF @@ROWCOUNT=0 THROW 50083,'EXPENSE_ROLLBACK_CONFLICT',1;
      SELECT @After=(SELECT ${snapshotColumns} FROM dbo.Expense WHERE Id=@Id AND CompanyId=@Company FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
      INSERT INTO dbo.AuditLog(CompanyId,UserId,Action,Entity,EntityId,BeforeData,AfterData,Reason,CreatedAt)
        SELECT @Company,UserId,N'ROLLBACK_EXPENSE',N'EXPENSE',@Id,@Before,@After,N'Edición revertida por un error al actualizar el respaldo.',SYSUTCDATETIME()
        FROM (SELECT TOP 1 UserId FROM dbo.AuditLog WHERE CompanyId=@Company AND Entity=N'EXPENSE' AND EntityId=@Id AND Action=N'UPDATE_EXPENSE' ORDER BY Id DESC) AS actor;
      COMMIT TRANSACTION;
    END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK TRANSACTION; THROW; END CATCH;`,
    [input.expenseId, input.companyId, input.expenseTypeId, input.supplierId ?? null, input.documentType, input.receiptNumber, input.expenseDate,
      input.vatSource === 'CALCULATED' || input.vatSource === 'RECEIPT' ? 19 : 0, input.netAmount, input.vatAmount, input.vatSource,
      input.totalAmount, input.description ?? null]);
}
