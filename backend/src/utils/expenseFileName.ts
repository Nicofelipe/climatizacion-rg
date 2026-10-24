import path from 'path';

export function buildExpenseFileName(input: {
  expenseDate: string;
  employeeName: string;
  expenseId: number;
  mimeType: string;
  sourceName: string;
  receiptNumber: string;
}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.expenseDate) ||
      !Number.isFinite(Date.parse(input.expenseDate)) ||
      new Date(input.expenseDate).toISOString().slice(0, 10) !== input.expenseDate) {
    throw new Error('Invalid expense date for file name');
  }
  if (!Number.isSafeInteger(input.expenseId) || input.expenseId <= 0) {
    throw new Error('Invalid expense ID for file name');
  }
  const name = input.employeeName.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 100) || 'TRABAJADOR';
  const code = input.receiptNumber.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-]/g, '').toUpperCase().slice(0, 50);
  if (!code) throw new Error('Invalid receipt code for file name');
  const extensions: Record<string, string> = {
    'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp',
    'image/heic': '.heic', 'image/heif': '.heif', 'image/gif': '.gif',
  };
  const sourceExtension = path.extname(input.sourceName).toLowerCase();
  const extension = extensions[input.mimeType] ??
    (/^\.[a-z0-9]{1,8}$/.test(sourceExtension) ? sourceExtension : '.img');
  return `${input.expenseDate.replaceAll('-', '')}_${name}_${input.expenseId}_${code}${extension}`;
}
