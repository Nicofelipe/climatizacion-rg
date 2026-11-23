// Utilidades de lectura compartidas. Trabajan sobre texto en mayúsculas y sin tildes.

/** RUT chileno con dígito verificador correcto, en formato canónico 12345678-5. */
export function validRut(value: string): string | null {
  const raw = value.replace(/[.,\s]/g, '').replace(/[–—−]/g, '-').toUpperCase();
  const match = raw.match(/^([1-9]\d{6,7})-?([\dK])$/);
  if (!match) return null;
  let sum = 0, factor = 2;
  for (let index = match[1].length - 1; index >= 0; index--) {
    sum += Number(match[1][index]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const rest = 11 - sum % 11;
  return match[2] === (rest === 11 ? '0' : rest === 10 ? 'K' : String(rest)) ? `${match[1]}-${match[2]}` : null;
}

export function formatRut(value: string) {
  const [body, check] = value.split('-');
  return check ? `${body.replace(/\B(?=(\d{3})+$)/g, '.')}-${check}` : value;
}

/** IVA contenido en un total íntegramente afecto. Debe coincidir con backend/src/utils/receiptTax.ts. */
export function includedVat(total: number) {
  return total - Math.round(total / 1.19);
}

export function validDay(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const digitLookalikes: Record<string, string> = { O: '0', Q: '0', D: '0', I: '1', L: '1', '|': '1', S: '5', B: '8', Z: '2' };
const asDigits = (text: string) => text.replace(/[OQDILSBZ|]/g, char => digitLookalikes[char]);

/** Corrige confusiones típicas de la cámara solo donde el contexto es inequívoco. */
export function repairLine(line: string) {
  return line
    .replace(/\bT[O0]TA[L1I]\b/g, 'TOTAL').replace(/\bT[O0]TA[L1I]ES\b/g, 'TOTALES')
    .replace(/\b[1L|]\s?\.?V\.?A\b/g, 'IVA').replace(/\bB[O0]LETA/g, 'BOLETA').replace(/\bF[O0]LI[O0]\b/g, 'FOLIO')
    // El signo de grado de "N°" suele leerse como asterisco o comilla.
    .replace(/\bN\s?[*"'`´’“”^]+\s*[.:]?\s*(?=\d)/g, 'N° ')
    .replace(/\bEFECT[1I]V[O0]\b/g, 'EFECTIVO').replace(/\bFECHA\b|\bFECNA\b/g, 'FECHA')
    // Montos con separador de miles: $11.9OO, 1I.900
    .replace(/(^|[\s$:])([\dOILSB]{1,3}(?:[.,][\dOILSBQZ]{3})+)(?=$|[\s,;.-])/g,
      (whole, before: string, amount: string) => /\d/.test(amount) ? before + asDigits(amount) : whole)
    .replace(/\$\s*([\dOILSBQZ]{2,9})(?=$|\s)/g, (whole, amount: string) => (amount.match(/\d/g)?.length ?? 0) * 2 >= amount.length ? `$${asDigits(amount)}` : whole);
}

/** Monto en pesos enteros. Rechaza separadores mal ubicados y centavos: nunca redondea ni adivina. */
export function money(text: string): string {
  let value = text.replace(/\s/g, '').replace(/\$/g, '').replace(/\.-$|,-$|\.$/, '');
  if (!/^\d[\d.,]*$/.test(value)) return '';
  const cents = value.match(/^(.*\d)[.,](\d{2})$/);
  if (cents) {
    if (cents[2] !== '00') return '';
    value = cents[1];
  }
  if (!/^\d+$/.test(value) && !/^\d{1,3}(?:[.,]\d{3})+$/.test(value)) return '';
  const amount = Number(value.replace(/[.,]/g, ''));
  return Number.isSafeInteger(amount) && amount >= 0 && amount <= 999999999 ? String(amount) : '';
}
