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