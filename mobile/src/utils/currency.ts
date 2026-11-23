export function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(value));
}

/** Desde este total se pide una confirmación extra: un dígito de más es el error más caro. */
export const HIGH_AMOUNT = 1000000;

/** Deja solo dígitos de lo escrito: "$ 11.900" → "11900". */
export const amountDigits = (text: string) => text.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 9);

/** Muestra el monto con puntos mientras se escribe: "11900" → "11.900". */
export const groupDigits = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
