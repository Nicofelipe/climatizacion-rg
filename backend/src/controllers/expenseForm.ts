import type { Response } from 'express';
import type { DocumentType } from '../services/expense.service';
import { expenseTypeVatDefault } from '../services/expense.service';
import { parseSupplier, SupplierInput } from '../services/supplier.service';
import { validExpenseFields } from '../utils/expenseInput';
import { parseVat, receiptTax, VatSource } from '../utils/receiptTax';
import { receiptSubmissionError } from '../utils/receiptSubmission';
import { driveUnavailableMessage, isDriveAuthorizationError, safeErrorMessage } from '../utils/storageError';

export interface ExpenseForm {
  expenseTypeId: number; documentType: DocumentType; receiptNumber: string; expenseDate: string; totalAmount: number;
  description: string | null; supplier: SupplierInput; rawVatSource: unknown; rawVat: unknown;
}

/** Lee el formulario multipart (todo llega como texto). Devuelve un mensaje claro si algo falta. */
export function readExpenseForm(body: Record<string, unknown> = {}): { form: ExpenseForm } | { error: string } {
  const dateError = receiptSubmissionError(body.expenseDate);
  if (dateError) return { error: dateError };
  const expenseTypeId = Number(body.expenseTypeId);
  const totalAmount = Number(body.totalAmount);
  const description = body.description ? String(body.description) : null;
  const documentType = body.documentType ?? 'BOLETA';
  if (!Number.isInteger(expenseTypeId) || expenseTypeId <= 0) return { error: 'Selecciona el tipo de gasto.' };
  if (documentType !== 'BOLETA' && documentType !== 'FACTURA') return { error: 'Selecciona si el documento es boleta o factura.' };
  if (!validExpenseFields(body.receiptNumber, body.expenseDate, totalAmount, description)) {
    return { error: 'Revisa el número de boleta, la fecha y el total en pesos enteros. La descripción admite hasta 500 caracteres.' };
  }
  let supplier: SupplierInput;
  try { supplier = parseSupplier(body); }
  catch (error) { return { error: formErrorMessage(error) ?? 'Revisa los datos del comercio.' }; }
  return {
    form: {
      expenseTypeId, documentType, totalAmount, description, supplier,
      receiptNumber: String(body.receiptNumber), expenseDate: String(body.expenseDate),
      rawVatSource: body.vatSource, rawVat: body.vatAmount,
    },
  };
}

/** Aplica la regla de IVA del tipo de gasto y comprueba el monto antes de escribir nada. */
export async function resolveVat(form: ExpenseForm): Promise<{ vatSource: VatSource; vatAmount: number | null }> {
  const vat = parseVat(form.rawVatSource, form.rawVat, await expenseTypeVatDefault(form.expenseTypeId));
  receiptTax(form.totalAmount, vat.source, vat.vat);
  return { vatSource: vat.source, vatAmount: vat.vat };
}

const formErrors: Record<string, string> = {
  INVALID_EXPENSE_TYPE: 'El tipo de gasto seleccionado no está disponible.',
  INVALID_SUPPLIER_REFERENCE: 'El proveedor no está disponible para tu empresa.',
  SUPPLIER_RUT_INVALID: 'El RUT del comercio no es válido. Revisa el dígito verificador o déjalo vacío.',
  SUPPLIER_NAME_REQUIRED: 'Escribe el nombre del comercio junto con su RUT.',
  VAT_INVALID: 'El IVA indicado no es posible para ese total. Cópialo de la boleta o elige otra opción de IVA.',
  TOTAL_INVALID: 'El total debe ser un monto entero mayor que cero.',
};
export function formErrorMessage(error: unknown) {
  return error instanceof Error ? formErrors[error.message] ?? null : null;
}

/** Respuesta común a los errores de crear y editar. Nunca expone detalles internos. */
export function sendExpenseError(res: Response, error: unknown, role: string, operation: string) {
  const message = error instanceof Error ? error.message : '';
  const invalid = formErrorMessage(error);
  if (invalid) { res.status(400).json({ message: invalid }); return; }
  if (message.includes('RECEIPT_NUMBER_ALREADY_EXISTS')) {
    res.status(409).json({
      code: 'RECEIPT_NUMBER_ALREADY_EXISTS',
      message: 'Ya existe una boleta con ese número de ese comercio en tu empresa. Revisa tus boletas antes de volver a enviarla.',
    });
    return;
  }
  if (message === 'RECEIPT_IMAGE_ALREADY_USED') {
    res.status(409).json({ code: 'RECEIPT_IMAGE_ALREADY_USED', message: 'Esta misma foto ya respalda otra boleta de tu empresa. Adjunta la foto que corresponde.' });
    return;
  }
  console.error(`${operation} error:`, safeErrorMessage(error));
  if (isDriveAuthorizationError(error)) {
    res.status(409).json({ code: 'DRIVE_RECONNECT_REQUIRED', message: driveUnavailableMessage(role) });
    return;
  }
  res.status(500).json({ message: 'No fue posible guardar la boleta. Tus datos no se perdieron: inténtalo nuevamente.' });
}
