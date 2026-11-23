import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CreateExpenseRequest, DocumentType, getExpenseApi, getExpenseImageApi, saveExpenseApi, VatSource } from '@/api/expense.api';
import { expenseTypes } from '@/constants/expenseTypes';
import { useAuth } from '@/hooks/useAuth';
import { parseReceiptText, recognizeReceipt } from '@/utils/receiptOcr';
import type { ReceiptReading } from '@/utils/receiptOcrParser';
import { rememberCapture, takeRecoveredCapture } from '@/utils/pendingCapture';
import { includedVat, validRut } from '@/utils/receiptText';
import { receiptSubmissionError } from '@/utils/receiptSubmission';
import { notifyDataRefresh } from '@/utils/refreshEvents';
import { HIGH_AMOUNT } from '@/utils/currency';

export interface ReceiptFields {
  documentType: DocumentType; receiptNumber: string; expenseDate: string; totalAmount: string;
  typeId: number | null; vatSource: VatSource; vatAmount: string;
  supplierName: string; supplierRut: string; description: string;
}
export type FieldErrors = Partial<Record<keyof ReceiptFields | 'image', string>>;

const empty: ReceiptFields = {
  documentType: 'BOLETA', receiptNumber: '', expenseDate: '', totalAmount: '', typeId: null,
  vatSource: 'CALCULATED', vatAmount: '', supplierName: '', supplierRut: '', description: '',
};

/** Total sin IVA e IVA con la misma regla del servidor (backend/src/utils/receiptTax.ts). */
export function taxPreview(fields: Pick<ReceiptFields, 'totalAmount' | 'vatSource' | 'vatAmount'>) {
  const total = Number(fields.totalAmount);
  if (!total) return null;
  const vat = fields.vatSource === 'CALCULATED' ? includedVat(total) : fields.vatSource === 'RECEIPT' ? Number(fields.vatAmount) : 0;
  return { total, vat, net: total - vat };
}

export function validateReceipt(fields: ReceiptFields, hasImage: boolean): FieldErrors {
  const errors: FieldErrors = {};
  const total = Number(fields.totalAmount);
  if (!hasImage) errors.image = 'Agrega la foto de la boleta: es obligatoria.';
  if (!fields.receiptNumber.trim()) errors.receiptNumber = 'Escribe el número que aparece en la boleta.';
  else if (fields.receiptNumber.trim().length > 50) errors.receiptNumber = 'El número admite hasta 50 caracteres.';
  const dateError = fields.expenseDate ? receiptSubmissionError(fields.expenseDate) : 'Elige la fecha de la boleta.';
  if (dateError) errors.expenseDate = dateError;
  if (!total) errors.totalAmount = 'Escribe el total pagado, en pesos.';
  if (!fields.typeId) errors.typeId = 'Elige el tipo de gasto.';
  if (fields.vatSource === 'RECEIPT') {
    const vat = Number(fields.vatAmount);
    if (!vat) errors.vatAmount = 'Copia el IVA que aparece en la boleta.';
    else if (total && vat > includedVat(total) + 1) errors.vatAmount = 'Ese IVA es mayor que el posible para el total. Revísalo en la boleta.';
  }
  if (fields.supplierRut.trim() && !validRut(fields.supplierRut)) errors.supplierRut = 'El RUT no es válido. Revisa el dígito verificador o déjalo vacío.';
  else if (fields.supplierRut.trim() && !fields.supplierName.trim()) errors.supplierName = 'Escribe el nombre del comercio.';
  return errors;
}

export function useReceiptForm(editId?: number) {
  const { token, user } = useAuth();
  const [fields, setFields] = useState<ReceiptFields>(empty);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [image, setImage] = useState<{ uri: string; mimeType: string | null } | null>(null);
  const [savedImage, setSavedImage] = useState<{ uri: string | null; loading: boolean; error: string } | null>(null);
  const [reading, setReading] = useState<'idle' | 'working' | 'done' | 'failed'>('idle');
  const [result, setResult] = useState<ReceiptReading | null>(null);
  const [readError, setReadError] = useState('');
  const [loading, setLoading] = useState(Boolean(editId));
  const [blocked, setBlocked] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState<{ id: number; status: string; notice?: string | null } | null>(null);
  const [highConfirmed, setHighConfirmed] = useState(false);
  const [recoveredNotice, setRecoveredNotice] = useState(false);
  const attempt = useRef(0);
  const saveLock = useRef(false);
  // Campos que la persona ya cambió: una lectura posterior no los pisa.
  const touched = useRef(new Set<keyof ReceiptFields>());

  useEffect(() => () => { attempt.current++; }, []);

  const update = useCallback((change: Partial<ReceiptFields>) => {
    if ('totalAmount' in change) setHighConfirmed(false);
    for (const key of Object.keys(change) as (keyof ReceiptFields)[]) touched.current.add(key);
    setFields(current => ({ ...current, ...change }));
    setErrors(current => { const next = { ...current }; for (const key of Object.keys(change)) delete next[key as keyof ReceiptFields]; return next; });
    setSaveError('');
  }, []);

  const chooseType = useCallback((typeId: number) => {
    setFields(current => {
      // El tipo propone el IVA solo si nadie lo indicó antes (la lectura o la persona).
      const keepVat = touched.current.has('vatSource') || current.vatAmount !== '';
      return { ...current, typeId, ...(keepVat ? {} : { vatSource: expenseTypes.find(item => item.id === typeId)?.vatDefault ?? 'CALCULATED' }) };
    });
    touched.current.add('typeId');
    setErrors(current => ({ ...current, typeId: undefined }));
  }, []);

  useEffect(() => {
    if (!editId || !token) return;
    let active = true;
    setLoading(true);
    getExpenseApi(token, editId).then(expense => {
      if (!active) return;
      if (expense.Status !== 'PENDING') { setBlocked('Esta boleta ya fue revisada y no se puede modificar.'); return; }
      if (expense.UserId !== user?.id) { setBlocked('Solo puedes editar tus propias boletas pendientes.'); return; }
      setFields({
        documentType: expense.DocumentType, receiptNumber: expense.ReceiptNumber, expenseDate: expense.ExpenseDate.slice(0, 10),
        totalAmount: String(Number(expense.TotalAmount)), typeId: expense.ExpenseTypeId, vatSource: expense.VatSource,
        vatAmount: expense.VatSource === 'RECEIPT' ? String(Number(expense.VatAmount)) : '',
        supplierName: expense.SupplierName ?? '', supplierRut: expense.SupplierRut ?? '', description: expense.Description ?? '',
      });
      // Al editar, una foto nueva no reemplaza los datos ya guardados.
      for (const key of Object.keys(empty) as (keyof ReceiptFields)[]) touched.current.add(key);
      if (!expense.file) return;
      setSavedImage({ uri: null, loading: true, error: '' });
      getExpenseImageApi(token, editId)
        .then(uri => { if (active) setSavedImage({ uri, loading: false, error: '' }); })
        .catch(error => { if (active) setSavedImage({ uri: null, loading: false, error: error instanceof Error ? error.message : 'No fue posible cargar la foto guardada.' }); });
    }).catch(error => { if (active) setBlocked(error instanceof Error ? error.message : 'No fue posible cargar la boleta.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [editId, token, user?.id]);

  const applyReading = useCallback((value: ReceiptReading) => {
    setFields(current => {
      const next = { ...current };
      const put = <K extends keyof ReceiptFields>(key: K, text: ReceiptFields[K] | '' | null) => { if (text && !touched.current.has(key)) next[key] = text as ReceiptFields[K]; };
      put('receiptNumber', value.receiptNumber);
      put('expenseDate', value.expenseDate);
      put('totalAmount', value.totalAmount);
      put('supplierName', value.supplierName);
      put('supplierRut', value.supplierRut);
      put('documentType', value.documentType);
      put('typeId', value.suggestedType);
      if (!touched.current.has('vatSource')) {
        const suggested = expenseTypes.find(item => item.id === next.typeId)?.vatDefault ?? 'CALCULATED';
        next.vatSource = value.vatSource ?? suggested;
        next.vatAmount = value.vatSource === 'RECEIPT' ? value.vatAmount : '';
      }
      return next;
    });
    setErrors({});
  }, []);

  const takeImage = useCallback(async (asset: { uri: string; mimeType?: string | null }) => {
    const id = ++attempt.current;
    setImage({ uri: asset.uri, mimeType: asset.mimeType ?? null });
    setErrors(current => ({ ...current, image: undefined }));
    setResult(null);
    setReadError('');
    setHighConfirmed(false);
    setReading('working');
    // Lo que había propuesto la foto anterior se descarta; lo escrito por la persona se conserva.
    setFields(current => {
      const next: Record<string, unknown> = { ...current };
      for (const key of Object.keys(empty) as (keyof ReceiptFields)[]) if (!touched.current.has(key)) next[key] = empty[key];
      return next as unknown as ReceiptFields;
    });
    try {
      const read = await recognizeReceipt(asset.uri);
      if (id !== attempt.current) return;
      const value = parseReceiptText(read.text, read.timbre);
      setResult(value);
      applyReading(value);
      setReading('done');
    } catch (error) {
      if (id !== attempt.current) return;
      setReadError(error instanceof Error ? error.message : 'No se pudo leer la foto.');
      setReading('failed');
    }
  }, [applyReading]);

  // Foto que quedó pendiente porque Android cerró la app con la cámara abierta.
  useEffect(() => {
    if (loading || blocked) return;
    const pending = takeRecoveredCapture(editId);
    if (!pending) return;
    touched.current = new Set(pending.form.touched as (keyof ReceiptFields)[]);
    setFields({ ...empty, ...pending.form.fields });
    if (pending.photo) void takeImage(pending.photo);
    else setRecoveredNotice(true);
  }, [loading, blocked, editId, takeImage]);

  /** Se llama justo antes de abrir la cámara o las fotos. */
  async function beforePicker(camera: boolean) {
    setRecoveredNotice(false);
    if (user) await rememberCapture({ userId: user.id, companyId: user.companyId, editId, camera, fields: { ...fields }, touched: [...touched.current] });
  }

  const removeImage = useCallback(() => {
    attempt.current++;
    setImage(null);
    setResult(null);
    setReading('idle');
    setReadError('');
  }, []);

  const hasImage = Boolean(image || savedImage);
  const isHigh = Number(fields.totalAmount) >= HIGH_AMOUNT;
  const tax = useMemo(() => taxPreview(fields), [fields]);

  async function save() {
    if (saveLock.current || saved || loading || blocked) return false;
    if (!token) { setSaveError('Tu sesión terminó. Vuelve a iniciar sesión para guardar.'); return false; }
    const found = validateReceipt(fields, hasImage);
    setErrors(found);
    if (Object.values(found).some(Boolean)) { setSaveError('Revisa los campos marcados antes de guardar.'); return false; }
    if (isHigh && !highConfirmed) { setSaveError('Confirma que el total es correcto: es un monto alto.'); return false; }
    saveLock.current = true;
    setSaving(true);
    setSaveError('');
    try {
      const data: CreateExpenseRequest = {
        expenseTypeId: fields.typeId!, documentType: fields.documentType, receiptNumber: fields.receiptNumber.trim(), expenseDate: fields.expenseDate,
        totalAmount: Number(fields.totalAmount), vatSource: fields.vatSource, vatAmount: Number(fields.vatAmount) || null,
        supplierName: fields.supplierName.trim() || null, supplierRut: validRut(fields.supplierRut), description: fields.description.trim() || null,
        imageUri: image?.uri, imageMimeType: image?.mimeType,
      };
      const response = await saveExpenseApi(token, data, editId);
      setSaved({ id: response.expense.Id, status: response.expense.Status, notice: response.approvalNotice });
      notifyDataRefresh();
      return true;
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'No fue posible guardar. Tus datos siguen aquí.');
      return false;
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }

  const reset = useCallback(() => {
    removeImage();
    touched.current.clear();
    setFields(empty);
    setErrors({});
    setSaved(null);
    setSaveError('');
  }, [removeImage]);

  return { fields, errors, image, savedImage, reading, result, readError, loading, blocked, saving, saveError, saved, tax, hasImage, update, chooseType, beforePicker, takeImage, removeImage, save, reset, isHigh, highConfirmed, setHighConfirmed, recoveredNotice };
}
