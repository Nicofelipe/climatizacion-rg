import { executeQuery } from '../database/sqlServer';

interface CreateExpenseInput {
  companyId: number;
  userId: number;
  expenseTypeId: number;
  supplierId?: number | null;
  receiptNumber: string;
  expenseDate: string;
  totalAmount: number;
  description?: string | null;
}

interface CreatedExpenseRow {
  Id: number;
  CompanyId: number;
  UserId: number;
  ExpenseTypeId: number;
  SupplierId: number | null;
  ReceiptNumber: string;
  ExpenseDate: string;
  NetAmount: number;
  VatAmount: number;
  TotalAmount: number;
  Description: string | null;
  Status: string;
  CreatedAt: string;
}

interface ExpenseListRow {
  DriveSyncPending: boolean;
  ReviewedAt: string | null;
  ReviewedByName: string | null;
  RejectionReason: string | null;
  Id: number;
  UserId: number;
  ReceiptNumber: string;
  ExpenseDate: string;
  ExpenseTypeId: number;
  ExpenseTypeName: string;
  SupplierId: number | null;
  SupplierName: string | null;
  NetAmount: number;
  VatAmount: number;
  TotalAmount: number;
  Description: string | null;
  Status: string;
  CreatedAt: string;

  FileId: number | null;
  FileProvider: string | null;
  FileProviderFileId: string | null;
  FileOriginalName: string | null;
  FileMimeType: string | null;
  FileSize: number | null;
}

interface RollbackUpdatedExpenseInput {
    companyId: number;
    expenseId: number;
    expenseTypeId: number;
    supplierId?: number | null;
    receiptNumber: string;
    expenseDate: string;
    netAmount: number;
    vatAmount: number;
    totalAmount: number;
    description?: string | null;
}

export async function createExpense(input: CreateExpenseInput) {
    const receiptNumber =
        input.receiptNumber.trim().toUpperCase();

    const existingExpenses =
        await executeQuery<{ Id: number }>(
            `
            SELECT TOP 1 Id
            FROM dbo.Expense
            WHERE CompanyId = ?
              AND ReceiptNumber = ?
              AND Status <> N'REJECTED'
              AND IsDeleted = 0;
            `,
            [
                input.companyId,
                receiptNumber,
            ]
        );

    if (existingExpenses.length > 0) {
        throw new Error(
            'RECEIPT_NUMBER_ALREADY_EXISTS'
        );
    }

    const taxRate = 19;

  const netAmount = Math.round(
    input.totalAmount / (1 + taxRate / 100)
  );

  const vatAmount = input.totalAmount - netAmount;

  const rows = await executeQuery<CreatedExpenseRow>(
    `
      INSERT INTO dbo.Expense
      (
        CompanyId,
        UserId,
        ExpenseTypeId,
        SupplierId,
        ReceiptNumber,
        ExpenseDate,
        Currency,
        TaxRate,
        NetAmount,
        VatAmount,
        TotalAmount,
        Description
      )
      OUTPUT
        INSERTED.Id,
        INSERTED.CompanyId,
        INSERTED.UserId,
        INSERTED.ExpenseTypeId,
        INSERTED.SupplierId,
        INSERTED.ReceiptNumber,
        INSERTED.ExpenseDate,
        INSERTED.NetAmount,
        INSERTED.VatAmount,
        INSERTED.TotalAmount,
        INSERTED.Description,
        INSERTED.Status,
        INSERTED.CreatedAt
      VALUES
      (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        'CLP',
        ?,
        ?,
        ?,
        ?,
        ?
      );
    `,
    [
      input.companyId,
      input.userId,
      input.expenseTypeId,
      input.supplierId ?? null,
      receiptNumber,
      input.expenseDate,
      taxRate,
      netAmount,
      vatAmount,
      input.totalAmount,
      input.description ?? null,
    ]
  );

  return rows[0];
}

export async function getExpenses(
  companyId: number,
  userId: number,
  role: string
) {
  const isAdmin = role === 'ADMIN';

  return executeQuery<ExpenseListRow>(
    `
      SELECT
        e.Id,
        e.UserId,
        e.ReceiptNumber,
        e.ExpenseDate,
        e.ExpenseTypeId,
        et.Name AS ExpenseTypeName,
        e.SupplierId,
        s.Name AS SupplierName,
        e.NetAmount,
        e.VatAmount,
        e.TotalAmount,
        e.Description,
        e.Status,
        e.CreatedAt
      FROM dbo.Expense AS e
      INNER JOIN dbo.ExpenseType AS et
        ON et.Id = e.ExpenseTypeId
      LEFT JOIN dbo.Supplier AS s
        ON s.Id = e.SupplierId
      WHERE e.CompanyId = ?
        AND e.IsDeleted = 0
        AND (? = 1 OR e.UserId = ?)
      ORDER BY e.ExpenseDate DESC, e.Id DESC;
    `,
    [
      companyId,
      isAdmin ? 1 : 0,
      userId,
    ]
  );
}

export async function getExpenseById(
  companyId: number,
  expenseId: number,
  userId: number,
  role: string
) {
  const rows = await executeQuery<ExpenseListRow>(
    `
      SELECT
        e.Id,
        e.UserId,
        e.ReceiptNumber,
        e.ExpenseDate,
        e.ExpenseTypeId,
        et.Name AS ExpenseTypeName,
        e.SupplierId,
        s.Name AS SupplierName,
        e.NetAmount,
        e.VatAmount,
        e.TotalAmount,
        e.Description,
        e.Status,
        e.CreatedAt,
        e.ReviewedAt,
        e.DriveSyncPending,
        e.RejectionReason,
        reviewer.FirstName + N' ' + reviewer.LastName AS ReviewedByName,

        f.Id AS FileId,
        f.Provider AS FileProvider,
        f.ProviderFileId AS FileProviderFileId,
        f.OriginalFileName AS FileOriginalName,
        f.MimeType AS FileMimeType,
        f.FileSize AS FileSize

      FROM dbo.Expense AS e

      INNER JOIN dbo.ExpenseType AS et
        ON et.Id = e.ExpenseTypeId

      LEFT JOIN dbo.Supplier AS s
        ON s.Id = e.SupplierId

      LEFT JOIN dbo.[File] AS f
        ON f.EntityType = N'EXPENSE'
        AND f.EntityId = e.Id
        AND f.CompanyId = e.CompanyId
      LEFT JOIN dbo.AppUser AS reviewer
        ON reviewer.Id = e.ReviewedByUserId AND reviewer.CompanyId = e.CompanyId

      WHERE e.Id = ?
        AND e.CompanyId = ?
        AND e.IsDeleted = 0
        AND (? = 1 OR e.UserId = ?);
        `,
      [
        expenseId,
        companyId,
        role === 'ADMIN' ? 1 : 0,
        userId,
      ]
  );

  const row = rows[0];

  if (!row) {
    return null;
  }

  return {
    Id: row.Id,
    DriveSyncPending: row.DriveSyncPending,
    ReviewedAt: row.ReviewedAt,
    ReviewedByName: row.ReviewedByName,
    RejectionReason: row.RejectionReason,
    ReceiptNumber: row.ReceiptNumber,
    ExpenseDate: row.ExpenseDate,
    ExpenseTypeId: row.ExpenseTypeId,
    ExpenseTypeName: row.ExpenseTypeName,
    SupplierId: row.SupplierId,
    SupplierName: row.SupplierName,
    NetAmount: row.NetAmount,
    VatAmount: row.VatAmount,
    TotalAmount: row.TotalAmount,
    Description: row.Description,
    Status: row.Status,
    CreatedAt: row.CreatedAt,

    file: row.FileId
      ? {
        Id: row.FileId,
        Provider: row.FileProvider,
        ProviderFileId: row.FileProviderFileId,
        OriginalFileName: row.FileOriginalName,
        MimeType: row.FileMimeType,
        FileSize: row.FileSize,
      }
      : null,
  };
}

interface UpdateExpenseInput {
    companyId: number;
    userId: number;
    role: string;
    expenseId: number;
    expenseTypeId: number;
    supplierId?: number | null;
    receiptNumber: string;
    expenseDate: string;
    totalAmount: number;
    description?: string | null;
}

export async function updateExpense(
    input: UpdateExpenseInput
) {
    const receiptNumber =
        input.receiptNumber.trim().toUpperCase();

    /*
     * Comprobamos que el nuevo número de boleta
     * no pertenezca a otro registro activo
     * de la misma empresa.
     */
    const duplicateRows =
        await executeQuery<{ Id: number }>(
            `
            SELECT TOP 1 Id
            FROM dbo.Expense
            WHERE CompanyId = ?
              AND ReceiptNumber = ?
              AND Id <> ?
              AND Status <> N'REJECTED'
              AND IsDeleted = 0;
            `,
            [
                input.companyId,
                receiptNumber,
                input.expenseId,
            ]
        );

    if (duplicateRows.length > 0) {
        throw new Error(
            'RECEIPT_NUMBER_ALREADY_EXISTS'
        );
    }

    const taxRate = 19;

    const netAmount = Math.round(
        input.totalAmount /
            (1 + taxRate / 100)
    );

    const vatAmount =
        input.totalAmount - netAmount;

    const isAdmin =
        input.role === 'ADMIN';

    const rows =
        await executeQuery<ExpenseListRow>(
            `
            SET NOCOUNT ON; SET XACT_ABORT ON;
            BEGIN TRY
            BEGIN TRANSACTION;
            DECLARE @Before nvarchar(max), @After nvarchar(max), @ChangedId int;
            SELECT @Before=(SELECT ExpenseDate,TotalAmount,NetAmount,VatAmount,Status,ExpenseTypeId,SupplierId,ReceiptNumber,Description
              FROM dbo.Expense WITH (UPDLOCK,HOLDLOCK) WHERE Id=? AND CompanyId=? FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
            UPDATE dbo.Expense
            SET
                ExpenseTypeId = ?,
                SupplierId = ?,
                ReceiptNumber = ?,
                ExpenseDate = ?,
                TaxRate = ?,
                NetAmount = ?,
                VatAmount = ?,
                TotalAmount = ?,
                Description = ?,
                UpdatedAt = SYSDATETIME()
            WHERE Id = ?
              AND CompanyId = ?
              AND IsDeleted = 0
              AND Status = N'PENDING'
              AND DriveSyncPending = 0
              AND (
                    ? = 1
                    OR UserId = ?
                  );
            IF @@ROWCOUNT>0 BEGIN
              SET @ChangedId=?;
              SELECT @After=(SELECT ExpenseDate,TotalAmount,NetAmount,VatAmount,Status,ExpenseTypeId,SupplierId,ReceiptNumber,Description
                FROM dbo.Expense WHERE Id=@ChangedId FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
              INSERT INTO dbo.AuditLog(CompanyId,UserId,Action,Entity,EntityId,BeforeData,AfterData,CreatedAt)
                VALUES(?,?,N'UPDATE_EXPENSE',N'EXPENSE',@ChangedId,@Before,@After,SYSUTCDATETIME());
            END;
            COMMIT TRANSACTION;
            SELECT * FROM dbo.Expense WHERE Id=@ChangedId;
            END TRY
            BEGIN CATCH
              IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
              THROW;
            END CATCH;
            `,
            [
                input.expenseId,input.companyId,
                input.expenseTypeId,
                input.supplierId ?? null,
                receiptNumber,
                input.expenseDate,
                taxRate,
                netAmount,
                vatAmount,
                input.totalAmount,
                input.description ?? null,

                input.expenseId,
                input.companyId,

                isAdmin ? 1 : 0,
                input.userId,
                input.expenseId,input.companyId,input.userId,
            ]
        );

    return rows[0] ?? null;
}

export async function deleteExpense(
  companyId: number,
  expenseId: number,
  userId: number,
  role: string
) {
  const rows = await executeQuery<{ Id: number }>(
    `
      UPDATE dbo.Expense
      SET
        IsDeleted = 1,
        UpdatedAt = SYSDATETIME()
      OUTPUT
        INSERTED.Id
      WHERE Id = ?
        AND CompanyId = ?
        AND IsDeleted = 0
        AND Status = N'PENDING'
        AND DriveSyncPending = 0
        AND (? = 1 OR UserId = ?);
    `,
    [expenseId, companyId, role === 'ADMIN' ? 1 : 0, userId]
  );

  return rows[0] ?? null;
}


export async function rollbackCreatedExpense(
    companyId: number,
    expenseId: number
) {
    await executeQuery(
        `
        DELETE FROM dbo.Expense
        WHERE Id = ?
          AND CompanyId = ?;
        `,
        [
            expenseId,
            companyId,
        ]
    );
}

export async function rollbackUpdatedExpense(
    input: RollbackUpdatedExpenseInput
) {
    await executeQuery(
        `
        SET NOCOUNT ON; SET XACT_ABORT ON;
        BEGIN TRY
        BEGIN TRANSACTION;
        DECLARE @Before nvarchar(max), @After nvarchar(max);
        SELECT @Before=(SELECT ExpenseDate,TotalAmount,NetAmount,VatAmount,Status,ExpenseTypeId,SupplierId,ReceiptNumber,Description
          FROM dbo.Expense WITH(UPDLOCK,HOLDLOCK) WHERE Id=? AND CompanyId=? FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
        UPDATE dbo.Expense
        SET
            ExpenseTypeId = ?,
            SupplierId = ?,
            ReceiptNumber = ?,
            ExpenseDate = ?,
            NetAmount = ?,
            VatAmount = ?,
            TotalAmount = ?,
            Description = ?,
            UpdatedAt = SYSDATETIME()
        WHERE Id = ?
          AND CompanyId = ?
          AND IsDeleted = 0;
        SELECT @After=(SELECT ExpenseDate,TotalAmount,NetAmount,VatAmount,Status,ExpenseTypeId,SupplierId,ReceiptNumber,Description
          FROM dbo.Expense WHERE Id=? AND CompanyId=? FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
        INSERT INTO dbo.AuditLog(CompanyId,UserId,Action,Entity,EntityId,BeforeData,AfterData,Reason,CreatedAt)
          SELECT ?,UserId,N'ROLLBACK_EXPENSE',N'EXPENSE',?,@Before,@After,N'Edición revertida por un error al actualizar el respaldo.',SYSUTCDATETIME()
          FROM (SELECT TOP 1 UserId FROM dbo.AuditLog WHERE CompanyId=? AND Entity=N'EXPENSE' AND EntityId=? AND Action=N'UPDATE_EXPENSE' ORDER BY Id DESC) AS actor;
        COMMIT TRANSACTION;
        END TRY
        BEGIN CATCH
          IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
          THROW;
        END CATCH;
        `,
        [
            input.expenseId,input.companyId,
            input.expenseTypeId,
            input.supplierId ?? null,
            input.receiptNumber,
            input.expenseDate,
            input.netAmount,
            input.vatAmount,
            input.totalAmount,
            input.description ?? null,
            input.expenseId,
            input.companyId,
            input.expenseId,input.companyId,input.companyId,input.expenseId,input.companyId,input.expenseId,
        ]
    );
}
