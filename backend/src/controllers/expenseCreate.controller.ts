import { Response } from 'express';
import fs from 'node:fs/promises';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { autoApproveSoleAdmin } from '../services/approvalPolicy.service';
import { createExpense, finishExpenseSync, rollbackCreatedExpense } from '../services/expense.service';
import { lockExpenseOperation } from '../services/expenseOperationLock.service';
import { createExpenseFile, FileProvider, isReceiptImageUsed } from '../services/file.service';
import { deleteStoredReceipt, hashFile, storeReceipt } from '../services/receiptStorage.service';
import { resolveSupplier } from '../services/supplier.service';
import { safeErrorMessage } from '../utils/storageError';
import { readExpenseForm, resolveVat, sendExpenseError } from './expenseForm';

/** Registra la boleta y su foto. Si algo falla a mitad de camino, deshace lo que alcanzó a crear. */
export async function createExpenseController(req: AuthenticatedRequest, res: Response) {
  const upload = req.file;
  let createdExpenseId: number | null = null;
  let storedFile: { provider: FileProvider; id: string } | null = null;
  let release: (() => void) | null = null;
  try {
    if (!req.user) { res.status(401).json({ message: 'Debes iniciar sesión.' }); return; }
    const { companyId, userId, role } = req.user;
    const parsed = readExpenseForm(req.body);
    if ('error' in parsed) { res.status(400).json({ message: parsed.error }); return; }
    if (!upload) { res.status(400).json({ message: 'La imagen de la boleta es obligatoria' }); return; }
    const { form } = parsed;
    const vat = await resolveVat(form);
    const contentHash = await hashFile(upload.path);
    if (await isReceiptImageUsed(companyId, contentHash)) throw new Error('RECEIPT_IMAGE_ALREADY_USED');
    const supplierId = await resolveSupplier(companyId, form.supplier);

    const expense = await createExpense({
      companyId, userId, supplierId, ...vat, expenseTypeId: form.expenseTypeId, documentType: form.documentType,
      receiptNumber: form.receiptNumber, expenseDate: form.expenseDate, totalAmount: form.totalAmount, description: form.description,
    });
    createdExpenseId = expense.Id;
    release = lockExpenseOperation(companyId, expense.Id);
    if (!release) throw new Error('EXPENSE_OPERATION_BUSY');

    storedFile = await storeReceipt({
      companyId, expenseId: expense.Id, receiptNumber: form.receiptNumber, expenseDate: form.expenseDate,
      localFilePath: upload.path, fileName: upload.filename, mimeType: upload.mimetype,
    });
    await createExpenseFile({
      companyId, expenseId: expense.Id, provider: storedFile.provider, providerFileId: storedFile.id,
      originalFileName: upload.originalname, mimeType: upload.mimetype, fileSize: upload.size, contentHash,
    });
    // Desde aquí la boleta y su foto están completas: ya no se deshacen.
    storedFile = null;
    createdExpenseId = null;
    await finishExpenseSync(companyId, expense.Id);

    let approvalNotice: string | null = null;
    if (role === 'ADMIN') {
      try { if (await autoApproveSoleAdmin(companyId, userId, expense.Id)) expense.Status = 'APPROVED'; }
      catch { approvalNotice = 'Boleta guardada como pendiente. No fue posible comprobar la aprobación automática; revisa su estado desde el detalle.'; }
    }
    res.status(201).json({ message: 'Boleta guardada con su foto.', approvalNotice, expense });
  } catch (error) {
    if (req.user && storedFile) {
      await deleteStoredReceipt(req.user.companyId, storedFile.provider, storedFile.id)
        .catch(cleanup => console.error('Receipt storage rollback error:', safeErrorMessage(cleanup)));
    }
    if (req.user && createdExpenseId) {
      await rollbackCreatedExpense(req.user.companyId, createdExpenseId)
        .catch(cleanup => console.error('Expense rollback error:', safeErrorMessage(cleanup)));
    }
    sendExpenseError(res, error, req.user?.role ?? 'EMPLOYEE', 'Create expense');
  } finally {
    release?.();
    if (upload) await fs.unlink(upload.path).catch(() => console.error('Temporary file cleanup failed'));
  }
}
