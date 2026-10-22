import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ExpenseStatus from './ExpenseStatus';
import { useAuth } from '@/hooks/useAuth';
import { useExpenses } from '@/hooks/useExpenses';
import { Colors } from '@/theme';
import { formatCurrency } from '@/utils/currency';

const filters = [
  { value: 'ALL', label: 'Todas' }, { value: 'PENDING', label: 'Pendientes' },
  { value: 'APPROVED', label: 'Aprobadas' }, { value: 'REJECTED', label: 'Rechazadas' },
];
function typeIcon(type: string) {
  const name = type.toLowerCase();
  if (name.includes('combustible')) return 'car-outline' as const;
  if (name.includes('colaci')) return 'restaurant-outline' as const;
  if (name.includes('material') || name.includes('insumo')) return 'construct-outline' as const;
  return 'receipt-outline' as const;
}

export default function ExpensesOverview() {
  const { user, token } = useAuth();
  const { expenses, isLoading, error, reload } = useExpenses(token);
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const visible = useMemo(() => {
    const text = search.trim().toLocaleLowerCase('es');
    return expenses.filter(item => (status === 'ALL' || item.Status === status) &&
      (!text || `${item.ReceiptNumber} ${item.ExpenseTypeName}`.toLocaleLowerCase('es').includes(text)));
  }, [expenses, status, search]);
  const pending = expenses.filter(item => item.Status === 'PENDING').length;
  const approved = expenses.filter(item => item.Status === 'APPROVED').length;

  return <SafeAreaView style={styles.page} edges={['top', 'left', 'right']}>
    <FlatList data={visible} keyExtractor={item => String(item.Id)} refreshing={isLoading} onRefresh={reload}
      contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
      ListHeaderComponent={<View style={{ gap: 22, marginBottom: 16 }}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}><Text style={styles.eyebrow}>BOLETAS Y RESPALDOS</Text><Text style={styles.title}>{user?.role === 'ADMIN' ? 'Boletas de tu empresa' : 'Mis boletas'}</Text></View>
          <View style={styles.headerIcon}><Ionicons name="receipt-outline" size={25} color={Colors.primary} /></View>
        </View>
        <Text style={styles.subtitle}>{user?.role === 'ADMIN' ? 'Consulta, revisa y mantén cada gasto en orden.' : 'Cada gasto, su historia. Cada boleta, su respaldo.'}</Text>
        <View style={styles.summary}>
          <View style={{ flex: 1 }}><Text style={styles.summaryLabel}>TODO TU REGISTRO</Text><Text style={styles.summaryNumber}>{isLoading && !expenses.length ? '…' : expenses.length}</Text><Text style={styles.summaryHint}>boletas registradas</Text></View>
          <View style={styles.summarySide}><Text style={styles.summarySideNumber}>{pending}</Text><Text style={styles.summaryHint}>pendientes</Text><View style={{ height: 8 }} /><Text style={styles.summarySideNumber}>{approved}</Text><Text style={styles.summaryHint}>aprobadas</Text></View>
        </View>
        <Pressable accessibilityRole="button" style={styles.primary} onPress={() => router.push('/(protected)/expenses/create')}><Ionicons name="add-circle-outline" size={21} color="white" /><Text style={styles.primaryText}>Registrar una boleta</Text></Pressable>
        <View style={styles.search}><Ionicons name="search-outline" size={19} color={Colors.textSecondary} /><TextInput accessibilityLabel="Buscar boletas" placeholder="Buscar por número o tipo de gasto" placeholderTextColor={Colors.textSecondary} value={search} onChangeText={setSearch} style={styles.searchInput} />{search ? <Pressable accessibilityRole="button" accessibilityLabel="Limpiar búsqueda" onPress={() => setSearch('')}><Ionicons name="close-circle" size={19} color={Colors.textSecondary} /></Pressable> : null}</View>
        <View style={styles.filters}>{filters.map(filter => <Pressable key={filter.value} accessibilityRole="button" accessibilityState={{ selected: status === filter.value }} onPress={() => setStatus(filter.value)} style={[styles.filter, status === filter.value && styles.selectedFilter]}><Text style={[styles.filterText, status === filter.value && { color: Colors.primary }]}>{filter.label}</Text></Pressable>)}</View>
        <View style={styles.row}><Text style={styles.resultCount}>{visible.length} resultado{visible.length !== 1 ? 's' : ''}</Text><Text style={styles.sort}>Más recientes primero</Text></View>
        {error ? <View style={styles.error}><Text accessibilityRole="alert" style={{ color: '#991B1B' }}>{error}</Text><Pressable onPress={reload} accessibilityRole="button"><Text style={styles.link}>Reintentar →</Text></Pressable></View> : null}
      </View>}
      ListEmptyComponent={isLoading ? <ActivityIndicator color={Colors.primary} style={{ padding: 30 }} /> : !error ? <View style={styles.empty}>
        <Ionicons name="documents-outline" size={42} color="#94A3B8" /><Text style={styles.emptyTitle}>{expenses.length ? 'No hay coincidencias' : 'Tu registro comienza aquí'}</Text><Text style={styles.emptyText}>{expenses.length ? 'Prueba otro número, tipo de gasto o estado.' : 'Agrega tu primera boleta y conserva el respaldo desde el primer día.'}</Text>
      </View> : null}
      renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Ver boleta ${item.ReceiptNumber}`} onPress={() => router.push({ pathname: '/(protected)/expenses/[id]', params: { id: item.Id } })} style={styles.card}>
        <View style={styles.row}>
          <View style={styles.typeIcon}><Ionicons name={typeIcon(item.ExpenseTypeName)} size={23} color={Colors.primary} /></View>
          <View style={{ flex: 1, gap: 5 }}><Text style={styles.type} numberOfLines={1}>{item.ExpenseTypeName}</Text><Text style={styles.receiptNumber} numberOfLines={1}>N.º {item.ReceiptNumber}</Text></View>
          <ExpenseStatus status={item.Status} />
        </View>
        {item.Description ? <Text numberOfLines={1} style={styles.description}>{item.Description}</Text> : null}
        <View style={styles.cardFooter}><View style={styles.date}><Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} /><Text style={styles.dateText}>{item.ExpenseDate.slice(0, 10).split('-').reverse().join('/')}</Text></View><View style={styles.date}><Text style={styles.amount}>{formatCurrency(item.TotalAmount)}</Text><Ionicons name="chevron-forward" size={18} color={Colors.primary} /></View></View>
      </Pressable>} />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.background },
  content: { width: '100%', maxWidth: 900, alignSelf: 'center', padding: 20, paddingBottom: 36 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  eyebrow: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 1.7, marginBottom: 9 },
  title: { color: Colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -1 },
  headerIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#E0F2F1', justifyContent: 'center', alignItems: 'center' },
  subtitle: { marginTop: -12, color: Colors.textSecondary, fontSize: 14, lineHeight: 22 },
  summary: { backgroundColor: '#17233D', borderRadius: 22, padding: 24, flexDirection: 'row', alignItems: 'center', gap: 20 },
  summaryLabel: { color: '#ADC0DE', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  summaryNumber: { color: 'white', fontSize: 46, fontWeight: '800', marginTop: 6 },
  summaryHint: { color: '#B8C8DE', fontSize: 12 },
  summarySide: { paddingLeft: 24, borderLeftWidth: 1, borderLeftColor: '#34425C' },
  summarySideNumber: { color: '#B7F2E2', fontSize: 20, fontWeight: '700' },
  primary: { backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 14, padding: 16 },
  primaryText: { color: 'white', fontWeight: '700', fontSize: 14 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'white', borderWidth: 1, borderColor: Colors.border, borderRadius: 14, paddingHorizontal: 15, minHeight: 52 },
  searchInput: { flex: 1, color: Colors.text, fontSize: 13, paddingVertical: 15 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filter: { borderRadius: 22, paddingHorizontal: 13, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: 'white' },
  selectedFilter: { backgroundColor: '#E1F5EF', borderColor: '#B7DCD3' },
  filterText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  resultCount: { fontSize: 12, fontWeight: '600', color: Colors.text }, sort: { fontSize: 11, color: Colors.textSecondary },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: Colors.border, gap: 15, marginBottom: 12 },
  typeIcon: { backgroundColor: '#EDF8F5', borderRadius: 13, height: 43, width: 43, alignItems: 'center', justifyContent: 'center' },
  type: { color: Colors.text, fontWeight: '700', fontSize: 14 },
  receiptNumber: { fontSize: 12, color: Colors.textSecondary }, description: { color: Colors.textSecondary, fontSize: 12 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#EEF1F6', paddingTop: 13, gap: 10 },
  date: { flexDirection: 'row', alignItems: 'center', gap: 7 }, dateText: { fontSize: 12, color: Colors.textSecondary }, amount: { fontSize: 19, fontWeight: '800', color: Colors.primary, letterSpacing: -0.5 },
  empty: { backgroundColor: 'white', padding: 32, borderRadius: 20, alignItems: 'center', gap: 14 },
  emptyTitle: { fontSize: 19, fontWeight: '700', color: Colors.text }, emptyText: { textAlign: 'center', color: Colors.textSecondary, lineHeight: 22, fontSize: 13 },
  error: { padding: 16, backgroundColor: '#FEF2F2', borderRadius: 14, gap: 12 }, link: { color: Colors.primary, fontWeight: '700' },
});
