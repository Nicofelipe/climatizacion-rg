import { ScrollView, StyleSheet, View } from 'react-native';
import Text from '@/components/ui/Text';
import { Progress, styles as kit } from '@/components/ui/kit';
import type { DashboardData } from '@/services/DashboardService';
import { Colors } from '@/theme';
import { chartPalette } from '@/theme/colors';
import { formatCurrency } from '@/utils/currency';
import { monthLabel } from '@/utils/dates';

const compact = (amount: number) => new Intl.NumberFormat('es-CL', { notation: 'compact', maximumFractionDigits: 1 }).format(amount);
const share = (value: number, total: number) => total > 0 ? Math.round(value / total * 100) : 0;

/** Barras ordenadas por monto. El porcentaje es sobre el gasto del período. */
export function CategoryBars({ groups, total, empty = 'Aún no hay gastos en este período.' }: { groups: { name: string; amount: number; count: number }[]; total: number; empty?: string }) {
  if (!groups.length) return <Text style={kit.subtitle}>{empty}</Text>;
  const largest = Math.max(...groups.map(item => item.amount), 1);
  return <View style={{ gap: 14 }}>{groups.map((item, index) => <View key={item.name} accessible accessibilityLabel={`${item.name}: ${formatCurrency(item.amount)}, ${share(item.amount, total)} por ciento`} style={{ gap: 6 }}>
    <View style={kit.between}><Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '600', flex: 1 }}>{item.name}</Text><Text style={{ fontSize: 14, fontWeight: '700' }}>{formatCurrency(item.amount)}</Text></View>
    <View style={s.track}><View style={{ height: 9, borderRadius: 5, width: `${Math.max(1.5, item.amount / largest * 100)}%`, backgroundColor: chartPalette[index % chartPalette.length] }} /></View>
    <Text style={kit.caption}>{item.count} {item.count === 1 ? 'boleta' : 'boletas'} · {share(item.amount, total)}%</Text>
  </View>)}</View>;
}

/** Gasto por mes; el último (seleccionado) va destacado. */
export function MonthBars({ points }: { points: { month: string; amount: number }[] }) {
  const max = Math.max(1, ...points.map(point => point.amount));
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
    <View style={[s.chart, { minWidth: points.length * 46 }]}>{points.map((point, index) => <View key={point.month} accessible accessibilityLabel={`${monthLabel(point.month)}: ${formatCurrency(point.amount)}`} style={s.column}>
      <Text style={s.small}>{point.amount ? compact(point.amount) : '–'}</Text>
      <View style={s.barArea}><View style={{ width: '62%', maxWidth: 44, height: point.amount ? Math.max(6, point.amount / max * 130) : 3, borderTopLeftRadius: 7, borderTopRightRadius: 7, backgroundColor: index === points.length - 1 ? Colors.primary : '#B9DEDC' }} /></View>
      <Text style={s.small}>{monthLabel(point.month, true).replace('.', '')}</Text>
    </View>)}</View>
  </ScrollView>;
}

export function BudgetMeter({ budget, admin }: { budget: DashboardData['budget']; admin: boolean }) {
  if (!budget) return <Text style={kit.subtitle}>{admin ? 'Define un monto mensual para ver cuánto queda disponible.' : 'Tu empresa no ha definido un presupuesto para ti.'}</Text>;
  const over = budget.remaining < 0;
  const tone = over ? 'danger' : budget.percent >= 85 ? 'warning' : 'primary';
  return <View style={{ gap: 10 }}>
    <View style={kit.between}><Text style={{ fontSize: 30, fontWeight: '800', letterSpacing: -0.6, color: over ? Colors.danger : Colors.text }}>{budget.percent.toLocaleString('es-CL', { maximumFractionDigits: 1 })}%</Text><Text style={[kit.caption, { textAlign: 'right' }]}>de {formatCurrency(budget.amount)}</Text></View>
    <Progress percent={budget.percent} tone={tone} />
    <Text style={{ fontSize: 14, fontWeight: '600', color: over ? Colors.danger : Colors.textSecondary }}>{over ? `Superado por ${formatCurrency(-budget.remaining)}` : `Quedan ${formatCurrency(budget.remaining)}`}</Text>
  </View>;
}

const s = StyleSheet.create({
  track: { height: 9, borderRadius: 5, backgroundColor: '#EBF2F2', overflow: 'hidden' },
  chart: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  column: { flex: 1, alignItems: 'center', gap: 6 },
  barArea: { height: 132, width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  small: { fontSize: 12, color: Colors.textMuted, textTransform: 'capitalize' },
});
