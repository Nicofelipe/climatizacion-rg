import { Response } from 'express';
import fs from 'node:fs/promises';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { finishExpenseSync, getExpenseById, rollbackUpdatedExpense, updateExpense } from '../services/expense.service';
import { lockExpenseOperation } from '../services/expenseOperationLock.service';
import {
  createExpenseFile, ExpenseFileRow, FileProvider, getExpenseFile, isReceiptImageUsed,
  rollbackCreatedExpenseFile, rollbackUpdatedExpenseFile, updateExpenseFile,
} from '../services/file.service';
import { deleteStoredReceipt, hashFile, relocateStoredReceipt, storeReceipt } from '../services/receiptStorage.service';
import { resolveSupplier } from '../services/supplier.service';
import { safeErrorMessage } from '../utils/storageError';
import { readExpenseForm, resolveVat, sendExpenseError } from './expenseForm';

const dateOnly = (value: Date | string) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
type Original = NonNullable<Awaited<ReturnType<typeof getExpenseById>>>;

/** Edita una boleta propia y pendiente. La foto anterior se conserva siempre en el respaldo. */
export async function updateExpenseController(req: AuthenticatedRequest, res: Response) {
  const upload = req.file;
  let release: (() => void) | null = null;
  let storedFile: { provider: FileProvider; id: string } | null = null;
  // Pasos completados, para deshacerlos en orden inverso si la operación falla.
  let updated: Original | null = null;
  let previousFile: ExpenseFileRow | null = null;
  let fileChange: 'created' | 'updated' | null = null;
  const expenseId = Number(req.params?.id);
  try {
    if (!req.user) { res.status(401).json({ message: 'Debes iniciar sesión.' }); return; }
    const { companyId, userId, role } = req.user;
    if (!Number.isSafeInteger(expenseId) || expenseId <= 0) { res.status(400).json({ message: 'La boleta indicada no es válida.' }); return; }
    release = lockExpenseOperation(companyId, expenseId);
    if (!release) { res.status(409).json({ message: 'La boleta tiene otra operación en curso. Espera y recarga su detalle.' }); return; }
    const parsed = readExpenseForm(req.body);
    if ('error' in parsed) { res.status(400).json({ message: parsed.error }); return; }
    const { form } = parsed;

    const original = await getExpenseById(companyId, expenseId, userId, role);
    if (!original) { res.status(404).json({ message: 'Boleta no disponible.' }); return; }
    if (original.UserId !== userId) {
      res.status(403).json({ message: 'Solo puedes editar tus propias boletas pendientes. Las de otros integrantes se aprueban o rechazan sin modificar sus datos.' });
      return;
    }
    if (original.Status !== 'PENDING') { res.status(409).json({ message: 'Solo se pueden editar boletas pendientes.' }); return; }

    const vat = await resolveVat(form);
    const contentHash = upload ? await hashFile(upload.path) : null;
    if (contentHash && await isReceiptImageUsed(companyId, contentHash, expenseId)) throw new Error('RECEIPT_IMAGE_ALREADY_USED');
    const supplierId = await resolveSupplier(companyId, form.supplier);
    const currentFile = await getExpenseFile(companyId, expenseId);
    previousFile = currentFile;

    // Primero se sube la foto nueva; la anterior no se toca.
    if (upload) {
      storedFile = await storeReceipt({
        companyId, expenseId, receiptNumber: form.receiptNumber, expenseDate: form.expenseDate,
        localFilePath: upload.path, fileName: upload.filename, mimeType: upload.mimetype,
      });
    }
    const expense = await updateExpense({
      companyId, userId, role, expenseId, supplierId, ...vat, expenseTypeId: form.expenseTypeId, documentType: form.documentType,
      receiptNumber: form.receiptNumber, expenseDate: form.expenseDate, totalAmount: form.totalAmount, description: form.description,
    });
    if (!expense) {
      if (storedFile) await deleteStoredReceipt(companyId, storedFile.provider, storedFile.id).catch(() => {});
      storedFile = null;
      res.status(409).json({ message: 'La boleta cambió mientras la editabas. Recarga su detalle.' });
      return;
    }
    updated = original;

    if (upload && storedFile) {
      const file = {
        companyId, expenseId, provider: storedFile.provider, providerFileId: storedFile.id,
        originalFileName: upload.originalname, mimeType: upload.mimetype, fileSize: upload.size, contentHash,
      };
      if (currentFile) {
        if (!await updateExpenseFile(file)) throw new Error('EXPENSE_FILE_UPDATE_FAILED');
        fileChange = 'updated';
      } else {
        await createExpenseFile(file);
        fileChange = 'created';
      }
    } else if (currentFile) {
      await relocateStoredReceipt({ companyId, expenseId, provider: currentFile.Provider, fileId: currentFile.ProviderFileId, expenseDate: form.expenseDate });
    }
    await finishExpenseSync(companyId, expenseId);
    updated = null;
    fileChange = null;
    storedFile = null;
    res.status(200).json({ message: 'Cambios guardados.', expense });
  } catch (error) {
    if (req.user) {
      const { companyId } = req.user;
      const attempt = async (label: string, undo: () => Promise<unknown>) => {
        try { await undo(); } catch (failure) { console.error(`${label}:`, safeErrorMessage(failure)); }
      };
      if (fileChange === 'created') await attempt('Created file rollback error', () => rollbackCreatedExpenseFile(companyId, expenseId));
      if (fileChange === 'updated' && previousFile) { const file = previousFile; await attempt('File rollback error', () => rollbackUpdatedExpenseFile(companyId, expenseId, file)); }
      if (storedFile) { const file = storedFile; await attempt('Receipt storage rollback error', () => deleteStoredReceipt(companyId, file.provider, file.id)); }
      if (updated) {
        const before = updated;
        await attempt('Expense update rollback error', () => rollbackUpdatedExpense({
          companyId, expenseId, expenseTypeId: before.ExpenseTypeId, supplierId: before.SupplierId, documentType: before.DocumentType,
          receiptNumber: before.ReceiptNumber, expenseDate: dateOnly(before.ExpenseDate), netAmount: before.NetAmount, vatAmount: before.VatAmount,
          vatSource: before.VatSource, totalAmount: before.TotalAmount, description: before.Description,
        }));
      }
    }
    sendExpenseError(res, error, req.user?.role ?? 'EMPLOYEE', 'Update expense');
  } finally {
    release?.();
    if (upload) await fs.unlink(upload.path).catch(() => console.error('Temporary file cleanup failed'));
  }
}
