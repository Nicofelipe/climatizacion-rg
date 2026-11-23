import type { IconName } from '@/components/ui/kit';
import type { VatSource } from '@/api/expense.api';

export interface ExpenseTypeOption { id: number; name: string; icon: IconName; vatDefault: VatSource }

// Los identificadores corresponden al catálogo de la base (database/seeds y migración 020).
export const expenseTypes: ExpenseTypeOption[] = [
  { id: 1, name: 'Colación', icon: 'restaurant-outline', vatDefault: 'CALCULATED' },
  { id: 2, name: 'Combustible', icon: 'car-outline', vatDefault: 'NOT_STATED' },
  { id: 3, name: 'Materiales', icon: 'construct-outline', vatDefault: 'CALCULATED' },
  { id: 4, name: 'Insumos', icon: 'cube-outline', vatDefault: 'CALCULATED' },
  { id: 6, name: 'Estacionamiento', icon: 'location-outline', vatDefault: 'CALCULATED' },
  { id: 5, name: 'Otros', icon: 'ellipsis-horizontal-circle-outline', vatDefault: 'CALCULATED' },
];

const clean = (name: string) => name.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

/** La base guarda el nombre en mayúsculas y sin tildes; se muestra con el nombre legible. */
export function expenseTypeOf(value: number | string) {
  return expenseTypes.find(item => typeof value === 'number' ? item.id === value : clean(item.name) === clean(value));
}
export const typeName = (value: string) => expenseTypeOf(value)?.name ?? value;
export const typeIcon = (value: string): IconName => expenseTypeOf(value)?.icon ?? 'receipt-outline';
