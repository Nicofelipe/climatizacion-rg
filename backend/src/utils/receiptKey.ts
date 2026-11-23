/** Debe coincidir con la columna calculada dbo.Expense.ReceiptKey (migración 023). */
export function receiptKey(receiptNumber: string) {
  return receiptNumber.toUpperCase().replace(/[ .-]/g, '').replace(/^0+/, '').slice(0, 50);
}

/** El número se guarda como lo muestra el documento, sin espacios sobrantes. */
export function cleanReceiptNumber(receiptNumber: string) {
  return receiptNumber.trim().replace(/\s+/g, ' ').toUpperCase();
}
