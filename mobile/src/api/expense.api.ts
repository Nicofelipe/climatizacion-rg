import { Platform } from 'react-native';

export interface Expense {
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

interface ExpenseListResponse {
    expenses: Expense[];
}

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export async function getExpensesApi(
    token: string
): Promise<Expense[]> {
    const response = await fetch(`${API_URL}/expenses`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    const result: ExpenseListResponse = await response.json();

    if (!response.ok) {
        throw new Error('No fue posible obtener las boletas');
    }

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
}

interface CreateExpenseResponse {
    message: string;
    expense: Expense;
}

export async function createExpenseApi(
    token: string,
    data: CreateExpenseRequest
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
        console.log('Sending imageUri:', data.imageUri);
        console.log('Platform:', Platform.OS);

        const fileName =
            data.imageUri.split('/').pop() ??
            `receipt-${Date.now()}.jpg`;

        if (Platform.OS === 'web') {
            const imageResponse = await fetch(data.imageUri);
            const blob = await imageResponse.blob();

            console.log('Image response ok:', imageResponse.ok);
            console.log('Image response type:', imageResponse.type);
            console.log('Blob type:', blob.type);
            console.log('Blob size:', blob.size);

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

            const mimeType =
                extension === 'png'
                    ? 'image/png'
                    : extension === 'webp'
                        ? 'image/webp'
                        : 'image/jpeg';

            formData.append(
                'image',
                {
                    uri: data.imageUri,
                    name: fileName,
                    type: mimeType,
                } as any
            );
        }
    }

    const response = await fetch(`${API_URL}/expenses`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.message ?? 'No fue posible registrar la boleta'
        );
    }

    return result.expense;
}