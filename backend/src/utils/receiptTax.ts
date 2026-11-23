export const VAT_RATE = 19;
export const vatSources = ['CALCULATED', 'RECEIPT', 'EXEMPT', 'NOT_STATED'] as const;
export type VatSource = (typeof vatSources)[number];
export interface ReceiptTax { source: VatSource; taxRate: number; net: number; vat: number }

/** IVA contenido en un total íntegramente afecto: en pesos enteros, neto redondeado y el resto es IVA. */
export function includedVat(total: number) {
  return total - Math.round(total / (1 + VAT_RATE / 100));
}

/**
 * Regla única de cálculo. `net` es siempre total − IVA: en documentos con exentos o impuesto específico
 * (combustible) incluye esos montos, porque no forman parte del IVA.
 */
export function receiptTax(total: number, source: VatSource, vat?: number | null): ReceiptTax {
  if (!Number.isSafeInteger(total) || total <= 0) throw new Error('TOTAL_INVALID');
  if (source === 'CALCULATED') {
    const value = includedVat(total);
    return { source, taxRate: VAT_RATE, vat: value, net: total - value };
  }
  if (source === 'RECEIPT') {
    // El IVA impreso nunca supera 19/119 del total; se admite $1 de redondeo del emisor.
    if (!Number.isSafeInteger(vat) || vat! <= 0 || vat! > includedVat(total) + 1) throw new Error('VAT_INVALID');
    return { source, taxRate: VAT_RATE, vat: vat!, net: total - vat! };
  }
  return { source, taxRate: 0, vat: 0, net: total };
}

/** Interpreta el IVA del formulario. Sin indicación explícita se usa la regla del tipo de gasto. */
export function parseVat(source: unknown, vat: unknown, fallback: VatSource): { source: VatSource; vat: number | null } {
  const hasVat = vat !== undefined && vat !== null && vat !== '';
  const amount = hasVat ? Number(vat) : null;
  if (hasVat && !Number.isSafeInteger(amount)) throw new Error('VAT_INVALID');
  if (source === undefined || source === null || source === '') {
    if (amount === null) return { source: fallback, vat: null };
    return amount === 0 ? { source: 'EXEMPT', vat: null } : { source: 'RECEIPT', vat: amount };
  }
  if (!vatSources.includes(source as VatSource)) throw new Error('VAT_INVALID');
  if (source === 'RECEIPT' && amount === null) throw new Error('VAT_INVALID');
  return { source: source as VatSource, vat: source === 'RECEIPT' ? amount : null };
}
