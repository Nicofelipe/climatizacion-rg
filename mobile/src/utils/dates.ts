const shortMonths = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** 2026-11-15 → 15/11/2026 */
export const shortDate = (value: string) => value.slice(0, 10).split('-').reverse().join('/');

/** 2026-11-15 → 15 nov 2026 */
export function readableDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${Number(day)} ${shortMonths[Number(month) - 1] ?? ''} ${year}`;
}

/** Hora de Chile a partir de una marca UTC; la API puede omitir la Z. */
export function dateTime(value: string) {
  const date = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`);
  return Number.isFinite(date.getTime()) ? date.toLocaleString('es-CL', { timeZone: 'America/Santiago', dateStyle: 'medium', timeStyle: 'short' }) : '';
}

export function monthLabel(month: string, short = false) {
  return new Date(`${month}-15T12:00:00Z`).toLocaleDateString('es-CL', short ? { month: 'short', timeZone: 'America/Santiago' } : { month: 'long', year: 'numeric', timeZone: 'America/Santiago' });
}
