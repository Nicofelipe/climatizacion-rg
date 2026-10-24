export function availablePeriodOptions(selectedYear: number, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en', { year: 'numeric', month: '2-digit', timeZone: 'America/Santiago' }).formatToParts(now);
  const currentYear = Number(parts.find(part => part.type === 'year')!.value);
  const currentMonth = parts.find(part => part.type === 'month')!.value;
  const monthCount = selectedYear > currentYear ? 0 : selectedYear === currentYear ? Number(currentMonth) : 12;
  return {
    currentYear, currentMonth, currentPeriod: `${currentYear}-${currentMonth}`,
    years: Array.from({ length: Math.max(0, currentYear - 1999) }, (_, index) => String(currentYear - index)),
    months: Array.from({ length: monthCount }, (_, index) => String(index + 1).padStart(2, '0')),
  };
}
