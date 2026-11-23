import { Platform } from 'react-native';
import { uploadImageBlob } from '@/utils/uploadImage';
import { API_URL, authorized, jsonBody, requestJson } from './http';

export type VatSource = 'CALCULATED' | 'RECEIPT' | 'EXEMPT' | 'NOT_STATED';
export type DocumentType = 'BOLETA' | 'FACTURA';
export type ExpenseStatusValue = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Expense {
  Id: number; UserId: number; UserName: string;
  DocumentType: DocumentType; ReceiptNumber: string; ExpenseDate: string;
  ExpenseTypeId: number; ExpenseTypeName: string;
  SupplierId: number | null; SupplierName: string | null; SupplierRut: string | null;
  NetAmount: number; VatAmount: number; VatSource: VatSource; TotalAmount: number;
  Description: string | null; Status: ExpenseStatusValue; CreatedAt: string; RejectionReason: string | null;
}

export interface ExpenseDetail extends Expense {
  CanReview?: boolean; DriveSyncPending?: boolean; SimilarCount?: number;
  ReviewedAt: string | null; ReviewedByName: string | null;
  file: { Id: number; OriginalFileName: string; MimeType: string | null; FileSize: number | null } | null;
}

export interface ExpenseFilters {
  scope: 'company' | 'personal'; status?: ExpenseStatusValue; workerId?: number; q?: string; from?: string; to?: string; typeId?: number; review?: boolean;
}
export interface ExpensePage {
  expenses: Expense[]; total: number; page: number; pageSize: number;
  states: { status: ExpenseStatusValue; count: number; amount: number }[];
}

export async function searchExpensesApi(token: string, filters: ExpenseFilters, page: number, pageSize: number, signal?: AbortSignal): Promise<ExpensePage> {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize), scope: filters.scope });
  for (const key of ['status', 'workerId', 'q', 'from', 'to', 'typeId'] as const) if (filters[key]) query.set(key, String(filters[key]));
  if (filters.review) query.set('review', '1');
  return requestJson(`${API_URL}/expenses/search?${query}`, { headers: authorized(token), signal });
}

export async function reviewExpensesApi(token: string, expenseIds: number[], decision: 'APPROVED' | 'REJECTED', reason?: string): Promise<{ message: string; updated: number }> {
  return requestJson(`${API_URL}/expenses/review`, jsonBody(token, { expenseIds, decision, reason }));
}

export async function getExpenseApi(token: string, id: number): Promise<ExpenseDetail> {
  return (await requestJson(`${API_URL}/expenses/${id}`, { headers: authorized(token) })).expense;
}

export async function getExpenseImageApi(token: string, id: number): Promise<string> {
  return (await requestJson(`${API_URL}/expenses/${id}/image`, { headers: authorized(token) }, 90000)).dataUri;
}

export async function deleteExpenseApi(token: string, id: number): Promise<{ message: string }> {
  return requestJson(`${API_URL}/expenses/${id}`, { method: 'DELETE', headers: authorized(token) });
}

export interface Supplier { Id: number; Name: string; Rut: string | null }
export async function searchSuppliersApi(token: string, text: string, signal?: AbortSignal): Promise<Supplier[]> {
  return (await requestJson(`${API_URL}/suppliers?q=${encodeURIComponent(text)}`, { headers: authorized(token), signal })).suppliers;
}

export interface CreateExpenseRequest {
  expenseTypeId: number; documentType: DocumentType; receiptNumber: string; expenseDate: string; totalAmount: number;
  vatSource: VatSource; vatAmount?: number | null;
  supplierId?: number | null; supplierName?: string | null; supplierRut?: string | null;
  description?: string | null; imageUri?: string | null; imageMimeType?: string | null;
}

const mimeByExtension: Record<string, string> = { png: 'image/png', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif', gif: 'image/gif' };

async function appendImage(form: FormData, uri: string, mimeType?: string | null) {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) throw new Error('No fue posible leer la imagen. Selecciónala de nuevo.');
    const blob = await response.blob();
    if (!blob.size) throw new Error('La imagen está vacía. Selecciona otra foto.');
    if (blob.size > 10 * 1024 * 1024) throw new Error('La imagen supera los 10 MB. Selecciona una foto más pequeña.');
    form.append('image', blob, `boleta-${Date.now()}.${blob.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'}`);
    return;
  }
  const fileName = uri.split('/').pop() || `boleta-${Date.now()}.jpg`;
  const extension = fileName.split('.').pop()?.toLowerCase() ?? 'jpg';
  form.append('image', await uploadImageBlob(uri, mimeType || mimeByExtension[extension] || 'image/jpeg'), fileName);
}

export async function saveExpenseApi(token: string, data: CreateExpenseRequest, expenseId?: number): Promise<{ expense: Expense; approvalNotice?: string | null }> {
  const form = new FormData();
  const fields = {
    expenseTypeId: data.expenseTypeId, documentType: data.documentType, receiptNumber: data.receiptNumber, expenseDate: data.expenseDate,
    totalAmount: data.totalAmount, vatSource: data.vatSource, vatAmount: data.vatSource === 'RECEIPT' ? data.vatAmount : null,
    supplierId: data.supplierName ? null : data.supplierId, supplierName: data.supplierName, supplierRut: data.supplierRut, description: data.description,
  };
  for (const [key, value] of Object.entries(fields)) if (value !== null && value !== undefined && value !== '') form.append(key, String(value));
  if (data.imageUri) await appendImage(form, data.imageUri, data.imageMimeType);
  return requestJson(`${API_URL}/expenses${expenseId ? `/${expenseId}` : ''}`, { method: expenseId ? 'PUT' : 'POST', headers: authorized(token), body: form }, 90000);
}
