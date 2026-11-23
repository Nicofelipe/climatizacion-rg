import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Expense, ExpenseFilters, ExpenseStatusValue, reviewExpensesApi } from '@/api/expense.api';
import { API_URL, authorized, requestJson } from '@/api/http';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Text from '@/components/ui/Text';
import { Banner, Card, Chip, EmptyState, IconTile, ScreenHeader, Sheet, styles as kit, useWide } from '@/components/ui/kit';
import { expenseTypes, typeIcon, typeName } from '@/constants/expenseTypes';
import { useAuth } from '@/hooks/useAuth';
import { useExpenses } from '@/hooks/useExpenses';
import { BorderRadius, Colors, Shadows } from '@/theme';
import { formatCurrency, HIGH_AMOUNT } from '@/utils/currency';
import { readableDate, shortDate } from '@/utils/dates';
import { notifyDataRefresh } from '@/utils/refreshEvents';
import ExpenseScopeSelector, { ExpenseScope } from './ExpenseScopeSelector';
import ExpenseStatus, { statusDesign } from './ExpenseStatus';
import ReceiptDateFilter from './ReceiptDateFilter';
import { useWebPullRefresh } from './RefreshableScrollView';

type StatusFilter = 'ALL' | ExpenseStatusValue;
interface Person { Id: number; FirstName: string; LastName: string }
const statuses: ExpenseStatusValue[] = ['PENDING', 'APPROVED', 'REJECTED'];

export default function ExpensesOverview() {
  const { user, token } = useAuth();
  const wide = useWide();
  const admin = user?.role === 'ADMIN';
  const params = useLocalSearchParams<{ workerId?: string; view?: string; review?: string; status?: string; stamp?: string }>();
  const [scope, setScope] = useState<ExpenseScope>('company');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [reviewOnly, setReviewOnly] = useState(false);
  const [worker, setWorker] = useState<number | undefined>();
  const [typeId, setTypeId] = useState<number | undefined>();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [reason, setReason] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  useEffect(() => { const timer = setTimeout(() => setQuery(search.trim()), 300); return () => clearTimeout(timer); }, [search]);
  useEffect(() => { if (/^\d+$/.test(params.workerId ?? '')) { setWorker(Number(params.workerId)); setScope('company'); setReviewOnly(false); } }, [params.workerId]);
  useEffect(() => {
    if (params.view === 'company' || params.view === 'personal') { setScope(params.view); setWorker(undefined); setReviewOnly(false); }
    if (params.status === 'ALL' || statuses.includes(params.status as ExpenseStatusValue)) setStatus(params.status as StatusFilter);
  }, [params.view, params.status, params.stamp]);
  useEffect(() => { if (params.review) { setScope('company'); setWorker(undefined); setTypeId(undefined); setStatus('ALL'); setSearch(''); setFrom(''); setTo(''); setReviewOnly(true); } }, [params.review]);
  useFocusEffect(useCallback(() => {
    let active = true;
    if (admin && token) requestJson(`${API_URL}/users`, { headers: authorized(token) }).then(result => { if (active) setPeople(result.employees); }).catch(() => {});
    return () => { active = false; };
  }, [token, admin]));

  const dateError = from && to && from > to ? 'La fecha «desde» debe ser anterior o igual a «hasta».' : '';
  const filters = useMemo<ExpenseFilters>(() => ({
    scope: admin ? scope : 'personal', status: reviewOnly || status === 'ALL' ? undefined : status, workerId: admin && scope === 'company' ? worker : undefined,
    typeId, q: query || undefined, from: dateError ? undefined : from || undefined, to: dateError ? undefined : to || undefined, review: reviewOnly || undefined,
  }), [admin, scope, status, reviewOnly, worker, typeId, query, from, to, dateError]);
  const { items, summary, loading, loadingMore, error, hasMore, reload, loadMore } = useExpenses(token, filters);
  const { handlers, control, refresh } = useWebPullRefresh(loading, reload);
  useEffect(() => { setSelected(new Set()); }, [filters]);

  const count = (value: StatusFilter) => value === 'ALL' ? summary?.states.reduce((sum, item) => sum + item.count, 0) : summary?.states.find(item => item.status === value)?.count;
  const visibleAmount = summary?.states.filter(item => reviewOnly || status === 'ALL' ? item.status !== 'REJECTED' : item.status === status).reduce((sum, item) => sum + item.amount, 0) ?? 0;
  const person = people.find(item => item.Id === worker);
  const activeFilters = [worker, typeId, from, to].filter(Boolean).length;
  const selectable = admin && reviewOnly;
  const allSelected = items.length > 0 && items.every(item => selected.has(item.Id));
  const highSelected = items.filter(item => selected.has(item.Id) && Number(item.TotalAmount) >= HIGH_AMOUNT).length;
  const selectedTotal = items.filter(item => selected.has(item.Id)).reduce((sum, item) => sum + Number(item.TotalAmount), 0);

  function clear() { setWorker(undefined); setTypeId(undefined); setFrom(''); setTo(''); router.setParams({ workerId: undefined }); }
  function toggle(id: number) { setSelected(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else if (next.size < 100) next.add(id); return next; }); }
  const open = (id: number) => router.push({ pathname: '/(protected)/expenses/[id]', params: { id } });

  async function confirmReview() {
    if (!token || !decision || reviewing || !selected.size) return;
    if (decision === 'REJECTED' && !reason.trim()) { setNotice({ tone: 'danger', text: 'Indica el motivo del rechazo.' }); return; }
    setReviewing(true);
    setNotice(null);
    try {
      const result = await reviewExpensesApi(token, [...selected], decision, reason);
      setNotice({ tone: 'success', text: `${result.updated} ${result.updated === 1 ? 'boleta' : 'boletas'} ${decision === 'APPROVED' ? (result.updated === 1 ? 'aprobada' : 'aprobadas') : (result.updated === 1 ? 'rechazada' : 'rechazadas')}.` });
      setSelected(new Set());
      setDecision(null);
      setReason('');
      notifyDataRefresh();
      reload();
    } catch (failure) { setNotice({ tone: 'danger', text: failure instanceof Error ? failure.message : 'No fue posible guardar la revisión.' }); }
    finally { setReviewing(false); }
  }

  const checkbox = (item: Expense) => <Pressable accessibilityRole="checkbox" aria-checked={selected.has(item.Id)} accessibilityLabel={`Seleccionar boleta ${item.ReceiptNumber}`} hitSlop={8} onPress={() => toggle(item.Id)}>
    <Ionicons name={selected.has(item.Id) ? 'checkbox' : 'square-outline'} size={24} color={selected.has(item.Id) ? Colors.primary : Colors.textMuted} />
  </Pressable>;

  const header = <View style={{ gap: 16, marginBottom: 14 }}>
    {control}
    <ScreenHeader title={reviewOnly ? 'Por revisar' : admin && scope === 'company' ? 'Boletas de la empresa' : 'Mis boletas'}
      subtitle={reviewOnly ? 'Selecciona varias para aprobarlas juntas, o abre una para ver su foto.' : 'Busca, filtra y abre cada boleta con su respaldo.'}
      right={!wide ? <Button compact title="Registrar" icon="add" onPress={() => router.push('/(protected)/expenses/create')} /> : undefined} />
    {notice ? <Banner tone={notice.tone}>{notice.text}</Banner> : null}
    <View style={[kit.wrap, { alignItems: 'center' }]}>
      {admin ? <ExpenseScopeSelector value={scope} onChange={value => { setScope(value); setReviewOnly(false); }} /> : null}
      <View style={{ flex: 1, minWidth: 220 }}><Input icon="search-outline" value={search} onChangeText={setSearch} placeholder="Número, comercio, RUT o persona" maxLength={100} autoCapitalize="none" /></View>
      <Button compact variant="secondary" icon="options-outline" title={activeFilters ? `Filtros (${activeFilters})` : 'Filtros'} onPress={() => setFiltersOpen(true)} style={{ minHeight: 50 }} />
    </View>
    <View style={kit.wrap}>
      {admin ? <Chip icon="hourglass-outline" label="Por revisar" active={reviewOnly} onPress={() => { setScope('company'); setReviewOnly(true); }} /> : null}
      <Chip label="Todas" active={!reviewOnly && status === 'ALL'} count={reviewOnly ? undefined : count('ALL')} onPress={() => { setReviewOnly(false); setStatus('ALL'); }} />
      {statuses.map(value => <Chip key={value} label={statusDesign[value].plural} active={!reviewOnly && status === value} count={reviewOnly ? undefined : count(value)} onPress={() => { setReviewOnly(false); setStatus(value); }} />)}
    </View>
    {activeFilters ? <View style={[kit.wrap, { alignItems: 'center' }]}>
      <Text style={kit.caption}>{[person && `${person.FirstName} ${person.LastName}`, typeId && expenseTypes.find(item => item.id === typeId)?.name, from && `desde ${shortDate(from)}`, to && `hasta ${shortDate(to)}`].filter(Boolean).join(' · ')}</Text>
      <Button compact variant="ghost" title="Quitar filtros" onPress={clear} />
    </View> : null}
    {dateError ? <Banner tone="warning">{dateError}</Banner> : null}
    {error ? <Banner tone="danger" action={<Button compact variant="secondary" title="Reintentar" onPress={reload} style={{ alignSelf: 'flex-start' }} />}>{error}</Banner> : null}
    <View style={kit.between}>
      <Text style={{ fontSize: 14, fontWeight: '700' }}>{summary ? `${summary.total} ${summary.total === 1 ? 'boleta' : 'boletas'} · ${formatCurrency(visibleAmount)}` : ' '}</Text>
      {selectable && items.length ? <Button compact variant="ghost" title={allSelected ? 'Quitar selección' : 'Seleccionar todas'} onPress={() => setSelected(allSelected ? new Set() : new Set(items.slice(0, 100).map(item => item.Id)))} /> : null}
    </View>
    {wide && items.length ? <View style={[s.tableRow, s.tableHead]}>
      {selectable ? <View style={{ width: 24 }} /> : null}
      {([['Fecha', 1], ['Comercio', 2], ['Número', 1.2], ['Tipo', 1.3], ...(admin ? [['Persona', 1.5]] : []), ['Estado', 1.2]] as [string, number][]).map(([label, flex]) => <Text key={label} style={[s.th, { flex }]}>{label}</Text>)}
      <Text style={[s.th, { flex: 1.1, textAlign: 'right' }]}>Total</Text>
    </View> : null}
  </View>;

  const tableRow = (item: Expense) => <Pressable accessibilityRole="button" accessibilityLabel={`Ver boleta ${item.ReceiptNumber}`} onPress={() => open(item.Id)} style={({ pressed }) => [s.tableRow, s.tableBody, (pressed || selected.has(item.Id)) && { backgroundColor: Colors.primarySofter }]}>
    {selectable ? checkbox(item) : null}
    <Text style={[s.td, { flex: 1 }]}>{shortDate(item.ExpenseDate)}</Text>
    <Text numberOfLines={1} style={[s.td, { flex: 2, fontWeight: '700' }]}>{item.SupplierName ?? 'Sin comercio'}</Text>
    <Text numberOfLines={1} style={[s.td, { flex: 1.2 }]}>{item.DocumentType === 'FACTURA' ? 'F ' : ''}{item.ReceiptNumber}</Text>
    <Text numberOfLines={1} style={[s.td, { flex: 1.3 }]}>{typeName(item.ExpenseTypeName)}</Text>
    {admin ? <Text numberOfLines={1} style={[s.td, { flex: 1.5 }]}>{item.UserId === user?.id ? 'Yo' : item.UserName}</Text> : null}
    <View style={{ flex: 1.2 }}><ExpenseStatus status={item.Status} /></View>
    <Text style={[s.td, { flex: 1.1, textAlign: 'right', fontWeight: '700' }]}>{formatCurrency(item.TotalAmount)}</Text>
  </Pressable>;

  const cardRow = (item: Expense) => <Pressable accessibilityRole="button" accessibilityLabel={`Ver boleta ${item.ReceiptNumber}`} onPress={() => open(item.Id)} style={({ pressed }) => [kit.card, s.card, (pressed || selected.has(item.Id)) && { borderColor: Colors.primary }]}>
    <View style={kit.row}>
      {selectable ? checkbox(item) : null}
      <IconTile icon={typeIcon(item.ExpenseTypeName)} />
      <View style={{ flex: 1, gap: 2 }}><Text numberOfLines={1} style={{ fontWeight: '700' }}>{item.SupplierName ?? typeName(item.ExpenseTypeName)}</Text><Text numberOfLines={1} style={kit.caption}>{item.DocumentType === 'FACTURA' ? 'Factura' : 'Boleta'} {item.ReceiptNumber} · {typeName(item.ExpenseTypeName)}</Text></View>
      <Text style={{ fontSize: 17, fontWeight: '800', color: Colors.primaryText }}>{formatCurrency(item.TotalAmount)}</Text>
    </View>
    <View style={kit.between}><ExpenseStatus status={item.Status} /><Text numberOfLines={1} style={[kit.caption, { flexShrink: 1 }]}>{admin ? `${item.UserId === user?.id ? 'Yo' : item.UserName} · ` : ''}{readableDate(item.ExpenseDate)}</Text></View>
    {item.Status === 'REJECTED' && item.RejectionReason ? <Text numberOfLines={2} style={{ fontSize: 13, color: Colors.danger }}>Motivo: {item.RejectionReason}</Text> : null}
  </Pressable>;

  return <View style={kit.page}>
    <FlatList {...handlers} key={wide ? 'table' : 'cards'} scrollEventThrottle={16} alwaysBounceVertical data={items} extraData={selected} keyExtractor={item => String(item.Id)} refreshing={loading} onRefresh={refresh}
      contentContainerStyle={[kit.content, { gap: 0 }]} keyboardShouldPersistTaps="handled" onEndReached={loadMore} onEndReachedThreshold={0.4}
      ListHeaderComponent={header} renderItem={({ item }) => wide ? tableRow(item) : cardRow(item)}
      ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.primary} style={{ padding: 20 }} /> : hasMore && !loading ? <Button variant="ghost" title="Cargar más" onPress={loadMore} /> : null}
      ListEmptyComponent={loading ? <ActivityIndicator color={Colors.primary} style={{ padding: 40 }} /> : error ? null : <Card><EmptyState icon={reviewOnly ? 'checkmark-done-outline' : 'receipt-outline'} title={reviewOnly ? 'Todo revisado' : query || activeFilters || status !== 'ALL' ? 'No hay coincidencias' : 'Aún no hay boletas'}>
        {reviewOnly ? 'No quedan boletas esperando tu revisión.' : query || activeFilters || status !== 'ALL' ? 'Prueba con otra búsqueda o quita algún filtro.' : 'Registra la primera con una foto: los datos se leen solos.'}
      </EmptyState></Card>} />

    {selectable && selected.size ? <View style={s.actions}>
      <View style={{ flex: 1, minWidth: 120 }}><Text style={{ fontWeight: '700', color: Colors.white }}>{selected.size} {selected.size === 1 ? 'seleccionada' : 'seleccionadas'}</Text><Text style={{ fontSize: 13, color: Colors.inkSoft }}>{formatCurrency(selectedTotal)}</Text></View>
      <Button compact variant="danger" icon="close" title="Rechazar" onPress={() => { setNotice(null); setDecision('REJECTED'); }} />
      <Button compact variant="success" icon="checkmark" title="Aprobar" onPress={() => { setNotice(null); setDecision('APPROVED'); }} />
    </View> : null}

    <Sheet visible={decision !== null} title={decision === 'APPROVED' ? 'Aprobar boletas' : 'Rechazar boletas'} onClose={() => { if (!reviewing) setDecision(null); }}
      footer={<View style={{ flexDirection: 'row', gap: 10 }}><Button title="Cancelar" variant="secondary" style={{ flex: 1 }} disabled={reviewing} onPress={() => setDecision(null)} /><Button title={decision === 'APPROVED' ? 'Aprobar' : 'Rechazar'} variant={decision === 'APPROVED' ? 'success' : 'danger'} style={{ flex: 1 }} loading={reviewing} onPress={() => { void confirmReview(); }} /></View>}>
      <Text style={kit.subtitle}>{selected.size} {selected.size === 1 ? 'boleta' : 'boletas'} por {formatCurrency(selectedTotal)}. Se guardará tu nombre y la fecha de la revisión.</Text>
      {decision === 'APPROVED' && highSelected ? <Banner tone="warning">{`${highSelected === 1 ? 'Una de ellas es' : `${highSelected} de ellas son`} de un millón de pesos o más. Revisa la foto antes de aprobar.`}</Banner> : null}
      {decision === 'REJECTED' ? <Input label="Motivo (lo verá cada trabajador)" value={reason} onChangeText={setReason} multiline maxLength={1000} /> : null}
      {notice?.tone === 'danger' ? <Banner tone="danger">{notice.text}</Banner> : null}
    </Sheet>

    <Sheet visible={filtersOpen} title="Filtros" onClose={() => setFiltersOpen(false)} footer={<View style={{ flexDirection: 'row', gap: 10 }}><Button title="Quitar" variant="secondary" style={{ flex: 1 }} onPress={clear} /><Button title="Ver boletas" style={{ flex: 1 }} onPress={() => setFiltersOpen(false)} /></View>}>
      {admin && scope === 'company' ? <View style={{ gap: 9 }}><Text style={s.filterLabel}>Persona</Text><View style={kit.wrap}><Chip label="Todas" active={!worker} onPress={() => setWorker(undefined)} />{people.map(item => <Chip key={item.Id} label={item.Id === user?.id ? 'Yo' : `${item.FirstName} ${item.LastName}`} active={worker === item.Id} onPress={() => setWorker(item.Id)} />)}</View></View> : null}
      <View style={{ gap: 9 }}><Text style={s.filterLabel}>Tipo de gasto</Text><View style={kit.wrap}><Chip label="Todos" active={!typeId} onPress={() => setTypeId(undefined)} />{expenseTypes.map(item => <Chip key={item.id} icon={item.icon} label={item.name} active={typeId === item.id} onPress={() => setTypeId(item.id)} />)}</View></View>
      <View style={{ gap: 9 }}><Text style={s.filterLabel}>Fecha de la boleta</Text><View style={kit.wrap}><ReceiptDateFilter label="Desde" value={from} onChange={setFrom} /><ReceiptDateFilter label="Hasta" value={to} onChange={setTo} /></View></View>
    </Sheet>
  </View>;
}

const s = StyleSheet.create({
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16 },
  tableHead: { paddingVertical: 4 },
  tableBody: { minHeight: 58, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, marginBottom: 6 },
  th: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  td: { fontSize: 14 },
  card: { marginBottom: 12, padding: 14, gap: 12 },
  actions: { position: 'absolute', left: 16, right: 16, bottom: 16, maxWidth: 720, marginHorizontal: 'auto', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: 14, borderRadius: BorderRadius.xl, backgroundColor: Colors.ink, ...Shadows.raised },
  filterLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
});
