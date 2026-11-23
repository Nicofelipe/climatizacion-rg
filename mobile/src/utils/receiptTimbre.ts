import { validDay, validRut } from './receiptText';

/**
 * Timbre electrónico del SII (código de barras PDF417 de boletas y facturas). Trae los datos exactos que declaró
 * el emisor: RUT, tipo de documento, folio, fecha y monto total. Cuando se puede leer, manda sobre el texto.
 */
export interface ReceiptTimbre {
  supplierRut: string; documentType: 'BOLETA' | 'FACTURA'; exempt: boolean;
  receiptNumber: string; expenseDate: string; totalAmount: string; firstItem: string;
}

const documents: Record<string, { documentType: 'BOLETA' | 'FACTURA'; exempt: boolean }> = {
  33: { documentType: 'FACTURA', exempt: false }, 34: { documentType: 'FACTURA', exempt: true },
  39: { documentType: 'BOLETA', exempt: false }, 41: { documentType: 'BOLETA', exempt: true },
};

export function parseTimbre(raw: string | null | undefined): ReceiptTimbre | null {
  if (!raw || !/<TED\b/i.test(raw)) return null;
  const field = (tag: string) => raw.match(new RegExp(`<${tag}>\\s*([^<]*?)\\s*</${tag}>`, 'i'))?.[1] ?? '';
  const rut = validRut(field('RE'));
  const document = documents[field('TD')];
  const folio = field('F').replace(/^0+(?=\d)/, '');
  const date = field('FE');
  const total = field('MNT');
  if (!rut || !document || !/^\d{1,20}$/.test(folio) || !/^20\d{2}-\d{2}-\d{2}$/.test(date) || !validDay(date)) return null;
  if (!/^\d{1,9}$/.test(total) || Number(total) <= 0) return null;
  const firstItem = field('IT1').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
  return { supplierRut: rut, ...document, receiptNumber: folio, expenseDate: date, totalAmount: String(Number(total)), firstItem };
}
