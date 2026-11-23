import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { BudgetMeter, CategoryBars, MonthBars } from '@/components/common/ExpenseCharts';
import DashboardPeriodSelector from '@/components/common/DashboardPeriodSelector';
import ExpenseScopeSelector, { ExpenseScope } from '@/components/common/ExpenseScopeSelector';
import ExpenseStatus, { statusDesign } from '@/components/common/ExpenseStatus';
import RefreshableScrollView from '@/components/common/RefreshableScrollView';
import Button from '@/components/ui/Button';
import Text from '@/components/ui/Text';
import { Banner, Card, EmptyState, IconTile, ScreenHeader, SectionTitle, Segmented, styles as kit, useWide } from '@/components/ui/kit';
import { typeIcon, typeName } from '@/constants/expenseTypes';
import { useAuth } from '@/hooks/useAuth';
import { useExpenseDashboard } from '@/hooks/useExpenseDashboard';
import { BorderRadius, Colors } from '@/theme';
import { formatCurrency } from '@/utils/currency';
import { monthLabel, readableDate } from '@/utils/dates';
import { availablePeriodOptions } from '@/utils/periodOptions';

export default function Dashboard() {
  const { user, token } = useAuth();
  const [month, setMonth] = useState(() => availablePeriodOptions(0).currentPeriod);
  const [mode, setMode] = useState<'month' | 'year'>('month');
  const [scope, setScope] = useState<ExpenseScope>('company');
  const { data, loading, error, reload } = useExpenseDashboard(token, month, mode, scope);
  const wide = useWide();
  const admin = user?.role === 'ADMIN';
  const company = admin && scope === 'company';
  const openList = (status?: string) => router.push({ pathname: '/(protected)/(tabs)/expenses', params: { view: company ? 'company' : 'personal', status: status ?? 'ALL', stamp: String(Date.now()) } });
  const openReview = () => router.push({ pathname: '/(protected)/(tabs)/expenses', params: { review: String(Date.now()) } });
  const grid = { flexDirection: wide ? 'row' : 'column', gap: 18, alignItems: 'stretch' } as const;

  return <View style={kit.page}>
    <RefreshableScrollView contentContainerStyle={kit.content} refreshing={loading} onRefresh={reload}>
      <ScreenHeader eyebrow={data?.companyName ?? 'Tu empresa'} title={user?.firstName?.trim() ? `Hola, ${user.firstName.trim()}` : 'Hola'}
        subtitle={company ? 'Así van los gastos de toda tu empresa.' : 'Así van tus propias boletas.'} />
      {!wide ? <Button title="Registrar boleta" icon="camera-outline" onPress={() => router.push('/(protected)/expenses/create')} /> : null}
      <View style={[kit.wrap, { alignItems: 'center' }]}>
        {admin ? <ExpenseScopeSelector value={scope} onChange={setScope} /> : null}
        <Segmented label="Período" value={mode} onChange={setMode} options={[{ value: 'month', label: 'Mes' }, { value: 'year', label: 'Año' }]} />
        <DashboardPeriodSelector value={month} onChange={setMonth} hideMonth={mode === 'year'} />
      </View>

      {error ? <Banner tone="danger" title="No pudimos cargar tu resumen" action={<Button compact variant="secondary" title="Reintentar" onPress={reload} style={{ alignSelf: 'flex-start' }} />}>{error}</Banner> : null}
      {loading && !data ? <Card style={{ alignItems: 'center', paddingVertical: 60 }}><ActivityIndicator color={Colors.primary} /></Card> : data ? <>
        {admin && data.pendingAllTime ? <Pressable accessibilityRole="button" onPress={openReview} style={({ pressed }) => [s.attention, pressed && { opacity: 0.85 }]}>
          <IconTile icon="hourglass-outline" tone="warning" />
          <View style={{ flex: 1, gap: 2 }}><Text style={{ fontWeight: '700' }}>{data.pendingAllTime === 1 ? '1 boleta pendiente' : `${data.pendingAllTime} boletas pendientes`}</Text><Text style={kit.caption}>Revísalas y apruébalas, una a una o varias a la vez.</Text></View>
          <Ionicons name="chevron-forward" size={20} color={Colors.warning} />
        </Pressable> : null}

        <View style={grid}>
          <View style={[s.hero, wide && { flex: 1.5 }]}>
            <Text style={s.heroLabel}>{company ? 'Gasto de la empresa' : 'Mi gasto'} · {mode === 'year' ? data.periodLabel : monthLabel(month)}</Text>
            <Text style={[s.heroTotal, wide && { fontSize: 46, lineHeight: 54 }]} adjustsFontSizeToFit numberOfLines={1}>{formatCurrency(data.total)}</Text>
            <View style={[kit.row, { gap: 7 }]}>
              <Ionicons name={data.changePercent === null ? 'remove-outline' : data.changePercent > 0 ? 'trending-up-outline' : 'trending-down-outline'} size={18} color={Colors.sunny} />
              <Text style={s.heroHint}>{data.changePercent === null ? `Sin gasto en el ${data.comparisonLabel}` : `${data.changePercent > 0 ? '+' : ''}${data.changePercent}% que el ${data.comparisonLabel}`}</Text>
            </View>
            <View style={s.heroFooter}>
              {[['Boletas', String(data.receiptCount)], ['Total sin IVA', formatCurrency(data.net)], ['IVA', formatCurrency(data.vat)]].map(([label, value]) => <View key={label} style={{ minWidth: 80, flexGrow: 1 }}><Text style={s.heroSmall}>{label}</Text><Text style={s.heroValue}>{value}</Text></View>)}
            </View>
            <Text style={s.heroSmall}>Pendientes y aprobadas; no incluye rechazadas.</Text>
          </View>
          <Card style={wide ? { flex: 1, justifyContent: 'center' } : undefined}>
            <SectionTitle title="Presupuesto" caption={mode === 'year' ? 'Meses transcurridos del año' : 'Del mes seleccionado'} action={admin ? <Button compact variant="ghost" title={data.budget ? 'Cambiar' : 'Definir'} onPress={() => router.push('/(protected)/budgets')} /> : undefined} />
            <BudgetMeter budget={data.budget} admin={admin} />
          </Card>
        </View>

        <View style={[kit.wrap, { gap: 12 }]}>{data.states.map(state => {
          const design = statusDesign[state.status];
          return <Pressable key={state.status} accessibilityRole="button" accessibilityLabel={`${design.plural}: ${state.count}`} onPress={() => openList(state.status)} style={({ pressed }) => [kit.card, s.state, pressed && { borderColor: Colors.primary }]}>
            <View style={kit.between}><IconTile icon={design.icon} tone={design.tone} size={36} /><Text style={{ fontSize: 26, fontWeight: '800' }}>{state.count}</Text></View>
            <View><Text style={{ fontSize: 13, fontWeight: '700' }}>{design.plural}</Text><Text style={kit.caption}>{formatCurrency(state.amount)}</Text></View>
          </Pressable>;
        })}</View>

        <View style={grid}>
          <Card style={wide ? { flex: 1 } : undefined}><SectionTitle title="En qué se gasta" caption="Por tipo de gasto" /><CategoryBars groups={data.categories.map(item => ({ ...item, name: typeName(item.name) }))} total={data.total} /></Card>
          <Card style={wide ? { flex: 1 } : undefined}><SectionTitle title="Mes a mes" caption={mode === 'year' ? 'Meses del año seleccionado' : 'Últimos seis meses'} /><MonthBars points={data.trend} /></Card>
        </View>

        <Card>
          <SectionTitle title="Últimas boletas" caption="Del período seleccionado" action={<Button compact variant="ghost" title="Ver todas" onPress={() => openList()} />} />
          {data.recent.length ? data.recent.map(receipt => <Pressable key={receipt.id} accessibilityRole="button" accessibilityLabel={`Ver boleta ${receipt.receiptNumber}`} style={({ pressed }) => [s.recent, pressed && { backgroundColor: Colors.surfaceMuted }]}
            onPress={() => router.push({ pathname: '/(protected)/expenses/[id]', params: { id: receipt.id } })}>
            <IconTile icon={typeIcon(receipt.type)} />
            <View style={{ flex: 1, gap: 2 }}><Text numberOfLines={1} style={{ fontWeight: '700', fontSize: 14 }}>{receipt.supplier ?? typeName(receipt.type)}</Text><Text numberOfLines={1} style={kit.caption}>N.º {receipt.receiptNumber} · {readableDate(receipt.date)}</Text></View>
            <View style={{ alignItems: 'flex-end', gap: 5 }}><Text style={{ fontWeight: '700', fontSize: 14 }}>{formatCurrency(receipt.total)}</Text><ExpenseStatus status={receipt.status} /></View>
          </Pressable>) : <EmptyState icon="receipt-outline" title="Sin boletas en este período">Registra una boleta o elige otra fecha.</EmptyState>}
        </Card>
      </> : null}
    </RefreshableScrollView>
  </View>;
}

const s = StyleSheet.create({
  attention: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14, borderRadius: BorderRadius.xl, backgroundColor: Colors.warningSoft },
  hero: { backgroundColor: Colors.ink, borderRadius: BorderRadius.xxl, padding: 24, gap: 10, justifyContent: 'center' },
  heroLabel: { color: Colors.inkSoft, fontSize: 13, fontWeight: '600' },
  heroTotal: { color: Colors.white, fontSize: 38, lineHeight: 46, fontWeight: '800', letterSpacing: -1 },
  heroHint: { color: Colors.white, fontSize: 13, flexShrink: 1 },
  heroFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, borderTopWidth: 1, borderTopColor: '#1F5C5E', paddingTop: 16, marginTop: 6 },
  heroSmall: { color: Colors.inkSoft, fontSize: 12, lineHeight: 17 },
  heroValue: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  state: { flex: 1, minWidth: 104, padding: 14, gap: 10 },
  recent: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 11, borderTopWidth: 1, borderTopColor: Colors.border },
});
