import { Segmented } from '@/components/ui/kit';

export type ExpenseScope = 'personal' | 'company';

export default function ExpenseScopeSelector({ value, onChange }: { value: ExpenseScope; onChange: (value: ExpenseScope) => void }) {
  return <Segmented label="Alcance" value={value} onChange={onChange} options={[{ value: 'company', label: 'Toda la empresa' }, { value: 'personal', label: 'Mis boletas' }]} />;
}
