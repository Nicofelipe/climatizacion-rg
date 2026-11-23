import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { API_URL, authorized, requestJson } from '@/api/http';
import Button from '@/components/ui/Button';
import Text from '@/components/ui/Text';
import { Banner, Card, IconTile, ScreenHeader, SectionTitle, Segmented, styles as kit, tones, useWide } from '@/components/ui/kit';
import { typeName } from '@/constants/expenseTypes';
import { useAuth } from '@/hooks/useAuth';
import { useExpenseDashboard } from '@/hooks/useExpenseDashboard';
import { Colors } from '@/theme';
import { formatCurrency } from '@/utils/currency';
import { monthLabel, readableDate } from '@/utils/dates';
import { availablePeriodOptions } from '@/utils/periodOptions';
import { saveReport } from '@/utils/saveReport';
import DashboardPeriodSelector from './DashboardPeriodSelector';
import { BudgetMeter, CategoryBars } from './ExpenseCharts';
import ExpenseScopeSelector, { ExpenseScope } from './ExpenseScopeSelector';
import { statusDesign } from './ExpenseStatus';
import RefreshableScrollView from './RefreshableScrollView';
import { ExpenseDonut, ExpenseLine, percent, percentText } from './ReportCharts';

export default function ReportsOverview() {
  const { token, user } = useAuth();
  const [period, setPeriod] = useState(() => availablePeriodOptions(0).currentPeriod);
  const [mode, setMode] = useState<'month' | 'year'>('month');
  const [chart, setChart] = useState<'daily' | 'monthly'>('daily');
  const [scope, setScope] = useState<ExpenseScope>('company');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const { data, loading, error, reload } = useExpenseDashboard(token, period, mode, scope);
  const wide = useWide();
  const admin = user?.role === 'ADMIN';
  const company = admin && scope === 'company';

  async function downloadExcel() {
    if (!token || exporting) return;
    setExporting(true);
    setExportError('');
    try {
      const query = `year=${period.slice(0, 4)}${mode === 'month' ? `&month=${period.slice(5, 7)}` : ''}&scope=${scope}`;
      const result = await requestJson(`${API_URL}/reports/expenses?${query}`, { headers: authorized(token) }, 60000);
      await saveReport(result.filename, result.base64, result.mimeType);
    } catch (failure) { setExportError(failure instanceof Error ? failure.message : 'No fue posible descargar el Excel.'); }
    finally { setExporting(false); }
  }

  const counted = data?.states.filter(item => item.status !== 'REJECTED').reduce((sum, item) => sum + item.count, 0) ?? 0;
  const approved = data?.states.find(item => item.status === 'APPROVED')?.count ?? 0;
  const monthly = mode === 'year' || chart === 'monthly';
  const points = !data ? [] : monthly
    ? data.trend.map(item => ({ key: item.month, label: monthLabel(item.month, true), description: monthLabel(item.month), amount: item.amount }))
    : data.daily.map(item => ({ key: item.date, label: item.date.slice(8), description: readableDate(item.date), amount: item.amount }));
  const grid = { flexDirection: wide ? 'row' : 'column', gap: 18, alignItems: 'stretch' } as const;
  const column = wide ? { flex: 1 } : undefined;

  return <View style={kit.page}>
    <RefreshableScrollView contentContainerStyle={kit.content} refreshing={loading} onRefresh={reload}>
      <ScreenHeader title="Reportes" subtitle="Según la fecha de la boleta. Incluye pendientes y aprobadas; las rechazadas no cuentan."
        right={admin && wide ? <Button icon="download-outline" title={exporting ? 'Preparando…' : 'Descargar Excel'} loading={exporting} onPress={() => { void downloadExcel(); }} /> : undefined} />
      <View style={[kit.wrap, { alignItems: 'center' }]}>
        {admin ? <ExpenseScopeSelector value={scope} onChange={setScope} /> : null}
        <Segmented label="Período" value={mode} onChange={setMode} options={[{ value: 'month', label: 'Mes' }, { value: 'year', label: 'Año' }]} />
        <DashboardPeriodSelector value={period} onChange={setPeriod} hideMonth={mode === 'year'} />
      </View>
      {admin && !wide ? <Button icon="download-outline" variant="secondary" title={`Descargar Excel ${mode === 'year' ? 'anual' : 'del mes'}`} loading={exporting} onPress={() => { void downloadExcel(); }} /> : null}
      {exportError ? <Banner tone="danger">{exportError}</Banner> : null}
      {error ? <Banner tone="danger" action={<Button compact variant="secondary" title="Reintentar" onPress={reload} style={{ alignSelf: 'flex-start' }} />}>{error}</Banner> : null}
      {loading && !data ? <Card style={{ alignItems: 'center', paddingVertical: 60 }}><ActivityIndicator color={Colors.primary} /></Card> : data ? <>
        <View style={kit.wrap}>
          {([
            ['wallet-outline', company ? 'Gasto de la empresa' : 'Mi gasto', formatCurrency(data.total), mode === 'year' ? data.periodLabel : monthLabel(period)],
            ['receipt-outline', 'Promedio por boleta', formatCurrency(counted ? Math.round(data.total / counted) : 0), `${counted} ${counted === 1 ? 'boleta' : 'boletas'}`],
            ['calculator-outline', 'IVA del período', formatCurrency(data.vat), `${formatCurrency(data.net)} sin IVA`],
            ['checkmark-done-outline', 'Aprobadas', percentText(percent(approved, data.receiptCount)), `${approved} de ${data.receiptCount}`],
          ] as const).map(([icon, label, value, hint]) => <Card key={label} style={s.kpi}><View style={kit.row}><IconTile icon={icon} size={34} /><Text style={{ fontSize: 13, fontWeight: '600', color: Colors.textSecondary, flex: 1 }}>{label}</Text></View><Text adjustsFontSizeToFit numberOfLines={1} style={s.value}>{value}</Text><Text style={kit.caption}>{hint}</Text></Card>)}
        </View>

        <Card>
          <SectionTitle title="Evolución del gasto" caption={data.changePercent === null ? `Sin gasto en el ${data.comparisonLabel} para comparar` : `${data.changePercent > 0 ? '+' : ''}${data.changePercent}% que el ${data.comparisonLabel} (${formatCurrency(data.previousTotal)})`}
            action={mode === 'month' ? <Segmented label="Detalle" value={chart} onChange={setChart} options={[{ value: 'daily', label: 'Días' }, { value: 'monthly', label: 'Meses' }]} /> : undefined} />
          <ExpenseLine key={`${mode}-${period}-${chart}`} points={points} />
        </Card>

        <View style={grid}>
          <Card style={column}><SectionTitle title="Por tipo de gasto" caption="Toca un tipo para ver su porcentaje" /><ExpenseDonut key={`${mode}-${period}-${scope}`} categories={data.categories.map(item => ({ ...item, name: typeName(item.name) }))} total={data.total} /></Card>
          <Card style={column}>
            <SectionTitle title="Estado de las boletas" caption="Sobre la cantidad de registros" />
            <View style={s.track}>{data.states.map(item => <View key={item.status} style={{ height: 12, width: `${percent(item.count, data.receiptCount)}%`, backgroundColor: item.status === 'PENDING' ? Colors.sunny : tones[statusDesign[item.status].tone].ink }} />)}</View>
            {data.states.map(item => { const design = statusDesign[item.status]; return <View key={item.status} style={kit.row}>
              <IconTile icon={design.icon} tone={design.tone} size={36} /><View style={{ flex: 1 }}><Text style={{ fontWeight: '600', fontSize: 14 }}>{design.plural}</Text><Text style={kit.caption}>{item.count} · {formatCurrency(item.amount)}</Text></View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: tones[design.tone].ink }}>{percentText(percent(item.count, data.receiptCount))}</Text>
            </View>; })}
            <View style={{ borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 14, gap: 10 }}><Text style={kit.sectionTitle}>Presupuesto</Text><BudgetMeter budget={data.budget} admin={admin} /></View>
          </Card>
        </View>

        <View style={grid}>
          <Card style={column}><SectionTitle title="Comercios con más gasto" caption="Boletas con comercio registrado" /><CategoryBars groups={data.suppliers} total={data.total} empty="Aún no hay boletas con comercio registrado." /></Card>
          {company ? <Card style={column}><SectionTitle title="Gasto por persona" /><CategoryBars groups={data.workers} total={data.total} /></Card> : null}
        </View>
      </> : null}
    </RefreshableScrollView>
  </View>;
}

const s = StyleSheet.create({
  kpi: { flex: 1, minWidth: 200, gap: 6, padding: 16 },
  value: { fontSize: 25, lineHeight: 32, fontWeight: '800', letterSpacing: -0.5 },
  track: { height: 12, borderRadius: 6, overflow: 'hidden', flexDirection: 'row', backgroundColor: '#EBF2F2' },
});
