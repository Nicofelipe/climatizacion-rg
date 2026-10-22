import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DashboardPeriodSelector from './DashboardPeriodSelector';
import { ExpenseDonut, ExpenseLine, percent } from './ReportCharts';
import { availablePeriodOptions } from '@/utils/periodOptions';
import { useExpenseDashboard } from '@/hooks/useExpenseDashboard';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/utils/currency';
import { Colors } from '@/theme';

const stateDesign = [
  { status: 'APPROVED', label: 'Aprobadas', color: '#16A34A', background: '#DCFCE7', icon: 'checkmark-circle-outline' },
  { status: 'PENDING', label: 'Pendientes', color: '#D99A16', background: '#FEF3C7', icon: 'time-outline' },
  { status: 'REJECTED', label: 'Rechazadas', color: '#DC2626', background: '#FEE2E2', icon: 'close-circle-outline' },
] as const;
const labelMonth = (value: string) => new Date(`${value}-15T12:00:00Z`).toLocaleDateString('es-CL', { month: 'short', timeZone: 'America/Santiago' });

export default function ReportsOverview() {
  const { token, user } = useAuth();
  const [period, setPeriod] = useState(() => availablePeriodOptions(0).currentPeriod);
  const [mode, setMode] = useState<'month' | 'year'>('month');
  const [chartMode, setChartMode] = useState<'daily' | 'monthly'>('daily');
  const { data, loading, error, reload } = useExpenseDashboard(token, period, mode);
  const wide = useWindowDimensions().width >= 900;
  const approved = data?.states.find(item => item.status === 'APPROVED');
  const counted = data?.states.filter(item => item.status !== 'REJECTED').reduce((sum, item) => sum + item.count, 0) ?? 0;
  const compareMonths = mode === 'year' || chartMode === 'monthly';
  const points = data ? compareMonths ? data.trend.map(item => ({ key: item.month, label: labelMonth(item.month), description: new Date(`${item.month}-15T12:00:00Z`).toLocaleDateString('es-CL', { month: 'long', year: 'numeric', timeZone: 'America/Santiago' }), amount: item.amount }))
    : data.daily.map(item => ({ key: item.date, label: item.date.slice(8), description: item.date.split('-').reverse().join('/'), amount: item.amount })) : [];
  const peak = points.reduce<(typeof points)[number] | null>((best, point) => point.amount > (best?.amount ?? 0) ? point : best, null);
  const peakTies = peak ? points.filter(point => point.amount === peak.amount).length : 0;

  return <SafeAreaView style={styles.page} edges={['top', 'left', 'right']}>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={Colors.primary} />}>
      <View style={styles.row}><View style={{ flex: 1 }}><Text style={styles.eyebrow}>TUS NÚMEROS, CON CLARIDAD</Text><Text style={styles.title}>Reportes</Text></View><View style={styles.headerIcon}><Ionicons name="analytics-outline" size={27} color={Colors.primary} /></View></View>
      <Text style={styles.subtitle}>{user?.role === 'ADMIN' ? 'Una mirada completa a los gastos de tu empresa.' : 'Entiende cómo se distribuyen tus gastos y cómo cambian en el tiempo.'}</Text>
      <View style={[styles.row, { alignItems: 'flex-start', flexWrap: 'wrap', gap: 18 }]}>
        <View style={{ gap: 12 }}><View style={styles.segment}>{([{ value: 'month', label: 'Mensual' }, { value: 'year', label: 'Anual' }] as const).map(item => <Pressable accessibilityRole="button" accessibilityState={{ selected: mode === item.value }} key={item.value} onPress={() => setMode(item.value)} style={[styles.segmentOption, mode === item.value && { backgroundColor: 'white' }]}><Text style={{ color: mode === item.value ? Colors.primary : Colors.textSecondary, fontWeight: '700', fontSize: 13 }}>{item.label}</Text></Pressable>)}</View><DashboardPeriodSelector value={period} onChange={setPeriod} hideMonth={mode === 'year'} /></View>
        <View style={styles.scope}><Ionicons name={user?.role === 'ADMIN' ? 'people-outline' : 'person-outline'} size={14} color={Colors.primary} /><Text style={styles.scopeText}>{user?.role === 'ADMIN' ? 'Solo tu empresa' : 'Solo tus boletas'}</Text></View>
      </View>
      {error ? <View style={styles.panel}><Text accessibilityRole="alert" style={{ color: '#B91C1C' }}>{error}</Text><Pressable onPress={reload} accessibilityRole="button"><Text style={styles.link}>Reintentar →</Text></Pressable></View> : null}
      {loading ? <View style={styles.panel}><ActivityIndicator color={Colors.primary} /><Text style={styles.subtitle}>Preparando tus gráficos…</Text></View> : data ? <>
        <View style={styles.kpis}>
          <View style={[styles.kpi, styles.darkKpi]}><Text style={styles.darkLabel}>GASTO DEL PERÍODO</Text><Text style={styles.darkValue}>{formatCurrency(data.total)}</Text><Text style={styles.darkHint}>{mode === 'year' ? data.periodLabel : new Date(`${period}-15T12:00:00Z`).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}</Text></View>
          <View style={styles.kpi}><View style={styles.smallIcon}><Ionicons name="receipt-outline" size={20} color={Colors.primary} /></View><Text style={styles.kpiValue}>{formatCurrency(counted ? Math.round(data.total / counted) : 0)}</Text><Text style={styles.kpiLabel}>Promedio por boleta</Text><Text style={styles.caption}>Pendientes y aprobadas</Text></View>
          <View style={styles.kpi}><View style={[styles.smallIcon, { backgroundColor: '#EDE9FE' }]}><Ionicons name="checkmark-done-outline" size={20} color="#7C3AED" /></View><Text style={styles.kpiValue}>{percent(approved?.count ?? 0, data.receiptCount)}%</Text><Text style={styles.kpiLabel}>Boletas aprobadas</Text><Text style={styles.caption}>{approved?.count ?? 0} de {data.receiptCount} registros del período</Text></View>
        </View>

        <View style={styles.panel}>
          <View style={styles.row}><View style={{ flex: 1 }}><Text style={styles.panelTitle}>{compareMonths ? 'Compara tus meses' : 'El pulso de tu mes'}</Text><Text style={styles.caption}>{mode === 'year' ? 'Meses del año seleccionado · hasta el período disponible' : compareMonths ? 'Últimos seis meses hasta el mes seleccionado' : 'Gasto por día · los días sin registros aparecen en cero'}</Text></View><View style={styles.chartIcon}><Ionicons name="trending-up-outline" size={21} color={Colors.primary} /></View></View>
          {mode === 'month' ? <View style={styles.segment}>{([{ value: 'daily', label: 'Por día' }, { value: 'monthly', label: 'Entre meses' }] as const).map(item => <Pressable key={item.value} accessibilityRole="button" accessibilityState={{ selected: chartMode === item.value }} onPress={() => setChartMode(item.value)} style={[styles.segmentOption, chartMode === item.value && { backgroundColor: 'white' }]}><Text style={{ color: chartMode === item.value ? Colors.primary : Colors.textSecondary, fontWeight: '700', fontSize: 13 }}>{item.label}</Text></Pressable>)}</View> : null}
          <Text style={styles.caption}>Según la fecha de la boleta, independiente de cuándo la registraste.</Text>
          <ExpenseLine key={`${mode}-${period}-${chartMode}`} points={points} />
          {compareMonths ? <View style={styles.insight}><Ionicons name="podium-outline" size={20} color={Colors.primary} /><Text style={styles.insightText}>{peak ? peakTies > 1 ? `${peakTies} meses comparten el mayor gasto: ${formatCurrency(peak.amount)} cada uno.` : `Mayor gasto: ${peak.description}, con ${formatCurrency(peak.amount)}.` : 'Aún no hay gastos en los meses comparados.'}</Text></View> : null}
          <View style={styles.insight}><Ionicons name="information-circle-outline" size={20} color={Colors.primary} /><Text style={styles.insightText}>{data.changePercent === null ? 'No hay gasto en el período anterior para calcular una variación porcentual.' : `El gasto cambió ${data.changePercent > 0 ? '+' : ''}${data.changePercent}% respecto al ${data.comparisonLabel}.`}</Text></View>
        </View>

        <View style={[styles.grid, { flexDirection: wide ? 'row' : 'column' }]}>
          <View style={[styles.panel, wide && { flex: 1 }]}><Text style={styles.panelTitle}>¿Dónde se va el gasto?</Text><Text style={styles.caption}>Participación de cada tipo sobre el monto total. Toca un segmento o su leyenda.</Text><ExpenseDonut key={`${mode}-${period}`} categories={data.categories} total={data.total} /></View>
          <View style={[styles.panel, wide && { flex: 1 }]}>
            <Text style={styles.panelTitle}>Estado de tus boletas</Text><Text style={styles.caption}>Porcentaje sobre la cantidad de registros, no sobre su monto.</Text>
            <View style={styles.stateTrack}>{stateDesign.map(item => {
              const state = data.states.find(value => value.status === item.status);
              return <View key={item.status} style={{ width: `${data.receiptCount ? (state?.count ?? 0) / data.receiptCount * 100 : 0}%`, backgroundColor: item.color, height: 13 }} />;
            })}</View>
            {stateDesign.map(item => {
              const state = data.states.find(value => value.status === item.status);
              const share = percent(state?.count ?? 0, data.receiptCount);
              return <View key={item.status} style={styles.stateRow}><View style={[styles.smallIcon, { backgroundColor: item.background }]}><Ionicons name={item.icon} size={20} color={item.color} /></View><View style={{ flex: 1, gap: 5 }}><Text style={styles.kpiLabel}>{item.label}</Text><Text style={styles.caption}>{state?.count ?? 0} boleta{state?.count !== 1 ? 's' : ''} · {formatCurrency(state?.amount ?? 0)}</Text></View><Text style={[styles.statePercent, { color: item.color }]}>{share}%</Text></View>;
            })}
            {!data.receiptCount ? <Text style={styles.caption}>Aún no hay boletas en este período.</Text> : null}
            <View style={styles.insight}><Ionicons name="bulb-outline" size={20} color={Colors.primary} /><Text style={styles.insightText}>{data.categories[0] ? `${data.categories[0].name} concentra el ${percent(data.categories[0].amount, data.total)}% del gasto registrado.` : 'Cuando registres boletas, aquí verás qué categoría concentra tus gastos.'}</Text></View>
          </View>
        </View>

        <View style={styles.budget}>
          <View style={styles.headerIcon}><Ionicons name="wallet-outline" size={26} color={Colors.primary} /></View>
          <View style={{ flex: 1, gap: 7 }}><Text style={styles.panelTitle}>Gasto frente al presupuesto</Text><Text style={styles.caption}>Sin presupuesto configurado</Text><Text style={styles.subtitle}>El porcentaje utilizado y el saldo disponible se mostrarán cuando exista un monto asignado por la empresa. Tu gasto actual es {formatCurrency(data.total)}.</Text></View>
        </View>
        <Text style={styles.footnote}>Montos en CLP · gasto incluye pendientes y aprobadas; excluye rechazadas.{ '\n' }{data.companyName} · {data.scope === 'personal' ? 'Información de tus propias boletas' : 'Información de tu empresa'}</Text>
      </> : null}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.background }, content: { width: '100%', maxWidth: 1120, alignSelf: 'center', padding: 20, paddingBottom: 36, gap: 24 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  eyebrow: { fontSize: 10, color: Colors.textSecondary, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10 }, title: { color: Colors.text, fontWeight: '800', fontSize: 32, letterSpacing: -1 }, subtitle: { color: Colors.textSecondary, fontSize: 13, lineHeight: 22 },
  headerIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E0F2F1' },
  segment: { flexDirection: 'row', alignSelf: 'flex-start', padding: 4, borderRadius: 12, backgroundColor: '#E9EEF7', gap: 4 }, segmentOption: { paddingVertical: 9, paddingHorizontal: 20, borderRadius: 9 },
  scope: { flexDirection: 'row', gap: 7, alignItems: 'center', backgroundColor: '#E1F5EF', borderRadius: 20, padding: 10 }, scopeText: { color: Colors.primary, fontWeight: '600', fontSize: 12 },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 }, kpi: { flex: 1, minWidth: 220, padding: 22, backgroundColor: 'white', borderRadius: 20, borderColor: Colors.border, borderWidth: 1, gap: 10 }, darkKpi: { backgroundColor: '#17233D', borderColor: '#17233D', justifyContent: 'center' },
  darkLabel: { color: '#ADC0DE', fontSize: 10, letterSpacing: 1.5, fontWeight: '700' }, darkValue: { color: 'white', fontSize: 34, fontWeight: '800', letterSpacing: -1 }, darkHint: { color: '#B8C8DE', fontSize: 12, textTransform: 'capitalize' },
  smallIcon: { backgroundColor: '#E1F5EF', width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }, kpiValue: { color: Colors.text, fontWeight: '800', fontSize: 27, letterSpacing: -0.7 }, kpiLabel: { color: Colors.text, fontWeight: '600', fontSize: 13 }, caption: { color: Colors.textSecondary, fontSize: 12, lineHeight: 20 },
  panel: { backgroundColor: 'white', borderRadius: 22, borderWidth: 1, borderColor: Colors.border, padding: 22, gap: 18 }, panelTitle: { color: Colors.text, fontSize: 19, fontWeight: '700', letterSpacing: -0.4 }, chartIcon: { backgroundColor: '#E1F5EF', borderRadius: 12, padding: 10 },
  grid: { gap: 16 }, insight: { backgroundColor: '#F0F9F6', padding: 14, borderRadius: 13, flexDirection: 'row', alignItems: 'center', gap: 10 }, insightText: { color: '#276052', fontSize: 12, lineHeight: 20, flex: 1 },
  stateTrack: { height: 13, backgroundColor: '#F1F5F9', borderRadius: 7, overflow: 'hidden', flexDirection: 'row', marginVertical: 9 }, stateRow: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 10 }, statePercent: { fontSize: 23, fontWeight: '800' },
  budget: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, borderWidth: 1, borderColor: '#CDE3DD', borderRadius: 22, backgroundColor: '#F0F9F6', padding: 22 },
  footnote: { color: '#7C899D', textAlign: 'center', fontSize: 11, lineHeight: 19 }, link: { color: Colors.primary, fontWeight: '700' },
});
