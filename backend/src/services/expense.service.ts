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
  Id: number;
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
}

export async function createExpense(input: CreateExpenseInput) {
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
      input.receiptNumber,
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

export async function getExpenses(companyId: number) {
  return executeQuery<ExpenseListRow>(
    `
      SELECT
        e.Id,
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
      ORDER BY e.ExpenseDate DESC, e.Id DESC;
    `,
    [companyId]
  );
}

export async function getExpenseById(
  companyId: number,
  expenseId: number
) {
  const rows = await executeQuery<ExpenseListRow>(
    `
      SELECT
        e.Id,
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
      WHERE e.Id = ?
        AND e.CompanyId = ?
        AND e.IsDeleted = 0;
    `,
    [expenseId, companyId]
  );

  return rows[0] ?? null;
}

interface UpdateExpenseInput {
  companyId: number;
  expenseId: number;
  expenseTypeId: number;
  supplierId?: number | null;
  receiptNumber: string;
  expenseDate: string;
  totalAmount: number;
  description?: string | null;
}

export async function updateExpense(input: UpdateExpenseInput) {
  const taxRate = 19;

  const netAmount = Math.round(
    input.totalAmount / (1 + taxRate / 100)
  );

  const vatAmount = input.totalAmount - netAmount;

  const rows = await executeQuery<ExpenseListRow>(
    `
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
      OUTPUT
        INSERTED.Id,
        INSERTED.ReceiptNumber,
        INSERTED.ExpenseDate,
        INSERTED.ExpenseTypeId,
        INSERTED.SupplierId,
        INSERTED.NetAmount,
        INSERTED.VatAmount,
        INSERTED.TotalAmount,
        INSERTED.Description,
        INSERTED.Status,
        INSERTED.CreatedAt
      WHERE Id = ?
        AND CompanyId = ?
        AND IsDeleted = 0;
    `,
    [
      input.expenseTypeId,
      input.supplierId ?? null,
      input.receiptNumber,
      input.expenseDate,
      taxRate,
      netAmount,
      vatAmount,
      input.totalAmount,
      input.description ?? null,
      input.expenseId,
      input.companyId,
    ]
  );

  return rows[0] ?? null;
}

export async function deleteExpense(
  companyId: number,
  expenseId: number
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
        AND IsDeleted = 0;
    `,
    [expenseId, companyId]
  );

  return rows[0] ?? null;
}