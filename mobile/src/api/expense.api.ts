import { Platform } from 'react-native';
import { requestJson } from './http';
import {uploadImageBlob} from '@/utils/uploadImage';

export interface Expense {
    UserId: number;
    UserName: string;
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

export interface ExpenseDetail extends Expense {
    CanReview?: boolean;
    DriveSyncPending?: boolean;
  ReviewedAt: string | null;
  ReviewedByName: string | null;
  RejectionReason: string | null;
  file: { Id: number; OriginalFileName: string; MimeType: string | null; FileSize: number | null } | null;
}

export async function reviewExpensesApi(token: string, expenseIds: number[], decision: 'APPROVED' | 'REJECTED', reason?: string) {
  return requestJson(`${API_URL}/expenses/review`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expenseIds, decision, reason }),
  });
}

export async function getExpenseApi(token: string, id: number): Promise<ExpenseDetail> {
  const result = await requestJson(`${API_URL}/expenses/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  return result.expense;
}

export async function getExpenseImageApi(token: string, id: number): Promise<string> {
  const result = await requestJson(`${API_URL}/expenses/${id}/image`, { headers: { Authorization: `Bearer ${token}` } }, 90000);
  return result.dataUri;
}

interface ExpenseListResponse {
    expenses: Expense[];
}

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export async function getExpensesApi(
    token: string, signal?: AbortSignal
): Promise<Expense[]> {
    const result: ExpenseListResponse = await requestJson(`${API_URL}/expenses`, {
        method: 'GET',
        signal,
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    return result.expenses;
}

export interface CreateExpenseRequest {
    expenseTypeId: number;
    supplierId?: number | null;
    receiptNumber: string;
    expenseDate: string;
    totalAmount: number;
    description?: string | null;
    imageUri?: string | null;
    imageMimeType?: string | null;
}

interface CreateExpenseResponse {
    message: string;
    expense: Expense;
}

export async function createExpenseApi(
    token: string,
    data: CreateExpenseRequest,
    expenseId?: number
): Promise<Expense> {
    const formData = new FormData();

    formData.append('expenseTypeId', String(data.expenseTypeId));
    formData.append('receiptNumber', data.receiptNumber);
    formData.append('expenseDate', data.expenseDate);
    formData.append('totalAmount', String(data.totalAmount));

    if (data.supplierId != null) {
        formData.append('supplierId', String(data.supplierId));
    }

    if (data.description) {
        formData.append('description', data.description);
    }

    if (data.imageUri) {

        const fileName =
            data.imageUri.split('/').pop() ??
            `receipt-${Date.now()}.jpg`;

        if (Platform.OS === 'web') {
            const imageResponse = await fetch(data.imageUri);
            if (!imageResponse.ok) throw new Error('No fue posible leer la imagen. Selecciónala de nuevo.');
            const blob = await imageResponse.blob();

            if (!blob.size) throw new Error('La imagen está vacía. Selecciona otra foto.');
            if (blob.size > 10 * 1024 * 1024) throw new Error('La imagen supera los 10 MB. Selecciona una foto más pequeña.');

            const extension =
                blob.type === 'image/png'
                    ? 'png'
                    : blob.type === 'image/webp'
                        ? 'webp'
                        : 'jpg';

            const uploadFileName =
                fileName.includes('.')
                    ? fileName
                    : `receipt-${Date.now()}.${extension}`;

            formData.append(
                'image',
                blob,
                uploadFileName
            );
        } else {
            const extension =
                fileName.split('.').pop()?.toLowerCase() ?? 'jpg';

            const extensionMime =
                extension === 'png'
                    ? 'image/png'
                    : extension === 'webp'
                        ? 'image/webp'
                        : extension==='heic'?'image/heic':extension==='heif'?'image/heif':extension==='gif'?'image/gif':'image/jpeg';
            const mimeType=data.imageMimeType||extensionMime;

            const blob=await uploadImageBlob(data.imageUri,mimeType);
            formData.append('image',blob,fileName);
        }
    }

    const result: CreateExpenseResponse = await requestJson(`${API_URL}/expenses${expenseId ? `/${expenseId}` : ''}`, {
        method: expenseId ? 'PUT' : 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: formData,
    }, 90000);

    return result.expense;
}
