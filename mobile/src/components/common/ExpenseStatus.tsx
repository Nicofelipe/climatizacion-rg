import { IconName, Pill, Tone } from '@/components/ui/kit';

export const statusDesign: Record<string, { label: string; plural: string; tone: Tone; icon: IconName }> = {
  PENDING: { label: 'Pendiente', plural: 'Pendientes', tone: 'warning', icon: 'time-outline' },
  APPROVED: { label: 'Aprobada', plural: 'Aprobadas', tone: 'success', icon: 'checkmark-circle-outline' },
  REJECTED: { label: 'Rechazada', plural: 'Rechazadas', tone: 'danger', icon: 'close-circle-outline' },
};

export default function ExpenseStatus({ status }: { status: string }) {
  const item = statusDesign[status];
  return <Pill label={item?.label ?? status} tone={item?.tone} icon={item?.icon} />;
}
