import { useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Image,Pressable, RefreshControl, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import styles, { dashboardPalette } from '@/components/common/DashboardOverview.styles';
import ExpenseStatus from '@/components/common/ExpenseStatus';
import DashboardPeriodSelector from '@/components/common/DashboardPeriodSelector';
import ExpenseScopeSelector from '@/components/common/ExpenseScopeSelector';
import RefreshableScrollView from '@/components/common/RefreshableScrollView';
import { useAuth } from '@/hooks/useAuth';
import { useExpenseDashboard } from '@/hooks/useExpenseDashboard';
import { formatCurrency } from '@/utils/currency';

function monthNow() {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  return `${parts.find(p => p.type === 'year')!.value}-${parts.find(p => p.type === 'month')!.value}`;
}
const monthLabel = (month: string, short = false) => new Date(`${month}-15T12:00:00Z`).toLocaleDateString('es-CL', short ? { month: 'short', timeZone: 'America/Santiago' } : { month: 'long', year: 'numeric', timeZone: 'America/Santiago' });
const compact = (amount: number) => new Intl.NumberFormat('es-CL', { notation: 'compact', maximumFractionDigits: 1 }).format(amount);
const stateDesign = [
  { status: 'PENDING', label: 'Pendientes', icon: 'time-outline', color: '#A16207', background: '#FEF3C7' },
  { status: 'APPROVED', label: 'Aprobadas', icon: 'checkmark-circle-outline', color: '#15803D', background: '#DCFCE7' },
  { status: 'REJECTED', label: 'Rechazadas', icon: 'close-circle-outline', color: '#B91C1C', background: '#FEE2E2' },
] as const;

export default function Dashboard() {
  const { user, token } = useAuth();
  const [month, setMonth] = useState(monthNow);
  const [mode, setMode] = useState<'month' | 'year'>('month');
  const [scope,setScope]=useState<'personal'|'company'>('company');
  const { data, loading, error, reload } = useExpenseDashboard(token, month, mode,scope);
  const wide = useWindowDimensions().width >= 850;
  const admin = user?.role === 'ADMIN';
  const companyView=admin&&scope==='company';
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();
  const maxTrend = Math.max(1, ...(data?.trend.map(item => item.amount) ?? []));
  const goExpenses = () => router.push({pathname:'/(protected)/(tabs)/expenses',params:{view:companyView?'company':'personal',workerId:undefined}});
  return <View style={styles.page}>
    <RefreshableScrollView contentContainerStyle={styles.content} refreshing={loading} onRefresh={reload}>
      <View style={styles.row}>
        <View style={styles.brand}>
          <View style={styles.brandIcon}><Image source={require('../../../../assets/images/clipit-icon.png')} style={{width:46,height:46}} resizeMode="contain" accessibilityLabel="Clepit"/></View>
          <View style={{ flexShrink: 1 }}><Text style={styles.overline}>CLEPIT · MI ESPACIO DE TRABAJO</Text><Text style={styles.company}>{data?.companyName ?? 'Tu empresa'}</Text></View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Abrir mi perfil" style={styles.avatar} onPress={() => router.push('/(protected)/(tabs)/profile')}><Text style={styles.avatarText}>{initials}</Text></Pressable>
      </View>

      <View>
        <Text style={styles.greeting}>{user?.firstName?.trim() ? `Hola, ${user.firstName.trim()}.` : 'Hola.'}</Text>
        <Text style={styles.subtitle}>{companyView ? 'Gastos de todos los integrantes de tu empresa, incluidos los tuyos.' : 'Este resumen incluye únicamente tus propias boletas.'}</Text>
      </View>
      {admin?<ExpenseScopeSelector value={scope} onChange={setScope}/>:null}
      <View style={[styles.row, { flexWrap: 'wrap' }]}>
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignSelf: 'flex-start', padding: 4, backgroundColor: '#E9EEF7', borderRadius: 12, gap: 4 }}>
            {([{ value: 'month', label: 'Mensual' }, { value: 'year', label: 'Anual' }] as const).map(item => <Pressable key={item.value} accessibilityRole="button" accessibilityState={{ selected: mode === item.value }} onPress={() => setMode(item.value)} style={{ paddingVertical: 9, paddingHorizontal: 20, borderRadius: 9, backgroundColor: mode === item.value ? '#FFFFFF' : 'transparent' }}><Text style={{ color: mode === item.value ? '#0F8277' : '#64748B', fontWeight: '700', fontSize: 13 }}>{item.label}</Text></Pressable>)}
          </View>
          <DashboardPeriodSelector value={month} onChange={setMonth} hideMonth={mode === 'year'} />
        </View>
        <View style={styles.scope}><Ionicons name={companyView ? 'people-outline' : 'person-outline'} size={14} color="#475569" /><Text style={styles.scopeText}>{companyView ? 'Resumen general · todos, incluyéndote' : 'Resumen personal · solo mis boletas'}</Text></View>
      </View>

      {error ? <View style={styles.panel}><Text accessibilityRole="alert" style={{ color: '#B91C1C' }}>{error}</Text><Pressable onPress={reload} accessibilityRole="button"><Text style={styles.link}>Volver a intentar →</Text></Pressable></View> : null}
      {loading ? <View style={styles.hero}><ActivityIndicator color="#B7F2E2" /><Text style={styles.heroHint}>Preparando tu resumen…</Text></View> : data ? <>
        <View style={[styles.topGrid, { flexDirection: wide ? 'row' : 'column' }]}>
          <View style={[styles.hero, wide && { flex: 1.6 }]}>
            <View style={styles.heroOrb} />
            <View>
              <Text style={styles.heroEyebrow}>{companyView?'GASTO DE TODA LA EMPRESA':'MI GASTO PERSONAL'} · {mode === 'year' ? 'ANUAL' : 'MENSUAL'}</Text>
              {mode === 'year' ? <Text style={[styles.heroHint, { textTransform: 'capitalize' }]}>{data.periodLabel}</Text> : null}
              <Text style={[styles.total, !wide && { fontSize: 38 }]}>{formatCurrency(data.total)}</Text>
              <Text style={styles.heroHint}>Incluye pendientes y aprobadas · excluye rechazadas</Text>
              <View style={styles.compare}><Ionicons name="analytics-outline" size={16} color="#B7F2E2" /><Text style={styles.compareText}>{data.changePercent === null ? (data.total > 0 ? `Sin gasto registrado en el ${data.comparisonLabel}` : 'Tu próximo registro empieza aquí') : `${data.changePercent > 0 ? '+' : ''}${data.changePercent}% respecto al ${data.comparisonLabel}`}</Text></View>
            </View>
            <View style={styles.heroFooter}>
              <View><Text style={styles.heroSmallLabel}>{mode === 'year' ? 'BOLETAS DEL AÑO' : 'BOLETAS DEL MES'}</Text><Text style={styles.heroSmallValue}>{data.receiptCount}</Text></View>
              <View><Text style={styles.heroSmallLabel}>NETO REGISTRADO</Text><Text style={styles.heroSmallValue}>{formatCurrency(data.net)}</Text></View>
              <View><Text style={styles.heroSmallLabel}>IVA REGISTRADO</Text><Text style={styles.heroSmallValue}>{formatCurrency(data.vat)}</Text></View>
            </View>
          </View>
          <View style={[styles.actionCard, wide && { flex: 1 }]}>
            <View style={styles.actionIcon}><Ionicons name="scan-outline" size={24} color="#0F8277" /></View>
            <View style={{ gap: 8 }}><Text style={styles.cardTitle}>Un gasto menos{ '\n' }por recordar.</Text><Text style={styles.body}>Fotografía tu boleta y regístrala al momento. Tu respaldo queda junto a los de tu empresa.</Text></View>
            <Pressable style={styles.primaryButton} accessibilityRole="button" onPress={() => router.push('/(protected)/expenses/create')}><Ionicons name="add" size={20} color="white" /><Text style={styles.primaryText}>Registrar boleta</Text></Pressable>
          </View>
        </View>

        <View style={styles.statusGrid}>{stateDesign.map(item => {
          const state = data.states.find(value => value.status === item.status);
          return <View key={item.status} style={styles.statusCard}>
            <View style={[styles.statusIcon, { backgroundColor: item.background }]}><Ionicons name={item.icon} size={18} color={item.color} /></View>
            <Text style={styles.statusNumber}>{state?.count ?? 0}</Text><Text style={styles.statusLabel}>{item.label}</Text><Text style={styles.statusAmount}>{formatCurrency(state?.amount ?? 0)}</Text>
          </View>;
        })}</View>

        <View style={styles.attention}>
          <Ionicons name={data.pendingAllTime ? 'time-outline' : 'checkmark-circle-outline'} size={23} color="#0F8277" />
          <Text style={styles.attentionText}>{data.pendingAllTime ? `${data.pendingAllTime} boleta${data.pendingAllTime === 1 ? '' : 's'} pendiente${data.pendingAllTime === 1 ? '' : 's'} en total, considerando todos los meses. ${admin ? 'Puedes revisarlas desde su detalle.' : 'Todavía puedes corregir sus datos.'}` : 'No hay boletas pendientes. Todo está al día con las revisiones.'}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Ver listado de boletas" onPress={goExpenses}><Ionicons name="arrow-forward" size={20} color="#0F8277" /></Pressable>
        </View>

        <View style={[styles.topGrid, { flexDirection: wide ? 'row' : 'column' }]}>
          <View style={[styles.panel, wide && { flex: 1 }]}>
            <View><Text style={styles.panelTitle}>¿En qué se ha gastado?</Text><Text style={styles.panelCaption}>Distribución {mode === 'year' ? 'del año' : 'del mes'} · pendientes y aprobadas</Text></View>
            {data.categories.length ? <>
              <View style={styles.stackBar}>{data.categories.map((category, index) => <View key={category.name} style={{ width: `${data.total ? category.amount / data.total * 100 : 0}%`, backgroundColor: dashboardPalette[index % dashboardPalette.length] }} />)}</View>
              {data.categories.map((category, index) => <View key={category.name}>
                <View style={styles.row}><View style={[styles.brand, { gap: 8 }]}><View style={[styles.categoryDot, { backgroundColor: dashboardPalette[index % dashboardPalette.length] }]} /><Text style={styles.categoryName}>{category.name}</Text></View><Text style={styles.categoryAmount}>{formatCurrency(category.amount)}</Text></View>
                <View style={styles.categoryTrack}><View style={{ height: 5, width: `${data.total ? category.amount / data.total * 100 : 0}%`, backgroundColor: dashboardPalette[index % dashboardPalette.length] }} /></View>
                <Text style={[styles.panelCaption, { marginTop: 6 }]}>{category.count} boleta{category.count !== 1 ? 's' : ''} · {data.total ? Math.round(category.amount / data.total * 100) : 0}% del gasto</Text>
              </View>)}
            </> : <Text style={styles.empty}>Aún no hay gastos pendientes o aprobados en este período. Registra tu primera boleta para ver la distribución.</Text>}
          </View>
          <View style={[styles.panel, wide && { flex: 1 }]}>
            <View><Text style={styles.panelTitle}>Tu gasto en perspectiva</Text><Text style={styles.panelCaption}>{mode === 'year' ? 'Gasto por mes del año seleccionado' : 'Últimos 6 meses hasta el período seleccionado'}</Text></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={mode === 'year'} contentContainerStyle={{ flexGrow: 1 }}>
            <View style={[styles.trendChart, { flexGrow: 1, minWidth: mode === 'year' ? data.trend.length * 44 : 240 }]}>{data.trend.map((point, index) => <View key={point.month} style={styles.trendColumn} accessible accessibilityLabel={`${monthLabel(point.month)}: ${formatCurrency(point.amount)}`}>
              <Text style={styles.trendValue}>{compact(point.amount)}</Text><View style={styles.trendTrack}><View style={[styles.trendBar, { height: point.amount ? Math.max(5, point.amount / maxTrend * 110) : 2, backgroundColor: index === data.trend.length - 1 ? '#0D9488' : '#CDD5F7' }]} /></View><Text style={styles.trendLabel}>{monthLabel(point.month, true)}</Text>
            </View>)}</View></ScrollView>
            <View style={{ borderTopWidth: 1, borderTopColor: '#EEF1F6', paddingTop: 16, gap: 5 }}><Text style={[styles.body, { textTransform: 'capitalize' }]}>{data.comparisonLabel}</Text><Text style={styles.cardTitle}>{formatCurrency(data.previousTotal)}</Text><Text style={styles.panelCaption}>Comparar te ayuda a anticipar tus próximos gastos.</Text></View>
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.row}><View><Text style={styles.panelTitle}>Últimas boletas</Text><Text style={styles.panelCaption}>Del período seleccionado · más recientes primero</Text></View><Pressable accessibilityRole="button" onPress={goExpenses}><Text style={styles.link}>Ver todas →</Text></Pressable></View>
          {data.recent.length ? data.recent.map(receipt => <Pressable accessibilityRole="button" accessibilityLabel={`Ver boleta ${receipt.receiptNumber}`} key={receipt.id} style={styles.recentRow} onPress={() => router.push({ pathname: '/(protected)/expenses/[id]', params: { id: receipt.id } })}>
            <View style={styles.receiptIcon}><Ionicons name="receipt-outline" size={21} color="#64748B" /></View>
            <View style={{ flex: 1, gap: 4 }}><Text style={styles.categoryName}>{receipt.type}</Text><Text style={styles.panelCaption}>N.º {receipt.receiptNumber} · {receipt.date.split('-').reverse().join('/')}</Text></View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}><Text style={styles.categoryAmount}>{formatCurrency(receipt.total)}</Text><ExpenseStatus status={receipt.status} /></View>
          </Pressable>) : <Text style={styles.empty}>No hay boletas en este período. Puedes registrar una nueva o consultar otra fecha.</Text>}
        </View>
        <Text style={styles.footnote}>Montos en CLP · {data.scope === 'company' ? 'Resumen de tu empresa' : 'Resumen de tus propias boletas'}{ '\n' }Actualizado a las {new Date(data.generatedAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' })}</Text>
      </> : null}
    </RefreshableScrollView>
  </View>;
}
