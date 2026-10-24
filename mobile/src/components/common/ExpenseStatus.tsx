import { Text, View } from 'react-native';

const statuses: Record<string, { label: string; color: string; background: string }> = {
  PENDING: { label: 'Pendiente', color: '#854D0E', background: '#FEF3C7' },
  REJECTED: { label: 'Rechazada', color: '#991B1B', background: '#FEE2E2' },
  APPROVED: { label: 'Aprobada', color: '#166534', background: '#DCFCE7' },
};
export default function ExpenseStatus({ status }: { status: string }) {
  const item = statuses[status] ?? { label: status, color: '#374151', background: '#F3F4F6' };
  return <View style={{ alignSelf: 'flex-start', backgroundColor: item.background, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
    <Text style={{ color: item.color, fontWeight: '700', fontSize: 12 }}>{item.label}</Text>
  </View>;
}
