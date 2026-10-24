import { useCallback, useEffect, useMemo, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import ExpenseStatus from './ExpenseStatus';
import ExpenseScopeSelector from './ExpenseScopeSelector';
import ReceiptDateFilter from './ReceiptDateFilter';
import { useWebPullRefresh } from './RefreshableScrollView';
import { requestJson } from '@/api/http';
import { useAuth } from '@/hooks/useAuth';
import { useExpenses } from '@/hooks/useExpenses';
import { Colors } from '@/theme';
import { formatCurrency } from '@/utils/currency';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const {handlers,control,refresh}=useWebPullRefresh(isLoading,reload);
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const params=useLocalSearchParams<{workerId?:string;view?:string;review?:string}>();
  const [scope,setScope]=useState<'company'|'personal'>('company');
  const [worker,setWorker]=useState('');
  const [choosingWorker,setChoosingWorker]=useState(false);
  const [people,setPeople]=useState<{Id:number;FirstName:string;LastName:string}[]>([]);
  const [from,setFrom]=useState('');const [to,setTo]=useState('');
  const [adminCount,setAdminCount]=useState<number|null>(null);
  const [reviewOnly,setReviewOnly]=useState(false);
  const [seen,setSeen]=useState<Set<number>>(new Set());
  const seenKey=`seen-receipts:${user?.companyId}:${user?.id}`;
  useFocusEffect(useCallback(()=>{let active=true;void AsyncStorage.getItem(seenKey).then(value=>{if(active){const ids=value?JSON.parse(value):[];setSeen(new Set(Array.isArray(ids)?ids.filter(id=>Number.isSafeInteger(id)&&id>0):[]));}}).catch(()=>{});return()=>{active=false;};},[seenKey]));
  function openExpense(id:number){const next=new Set(seen);next.add(id);setSeen(next);void AsyncStorage.setItem(seenKey,JSON.stringify([...next].slice(-2000))).catch(()=>{});router.push({pathname:'/(protected)/expenses/[id]',params:{id}});}
  useEffect(()=>{if(params.workerId){setWorker(params.workerId);setScope('company');}},[params.workerId]);
  useEffect(()=>{if(params.view==='company'||params.view==='personal'){setScope(params.view);setWorker('');}},[params.view]);
  useEffect(()=>{if(params.review){setScope('company');setWorker('');setStatus('PENDING');setSearch('');setFrom('');setTo('');setReviewOnly(true);}},[params.review]);
  useFocusEffect(useCallback(()=>{let active=true;if(user?.role==='ADMIN'&&token){
    requestJson(`${process.env.EXPO_PUBLIC_API_URL}/users`,{headers:{Authorization:`Bearer ${token}`}}).then(result=>{if(active)setPeople(result.employees);}).catch(()=>{});
    requestJson(`${process.env.EXPO_PUBLIC_API_URL}/users/approval-policy`,{headers:{Authorization:`Bearer ${token}`}}).then(result=>{if(active)setAdminCount(result.adminCount);}).catch(()=>{});
  }return()=>{active=false;};},[token,user?.role]));
  const validDate=(value:string)=>!value||(/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value);
  const dateError=!validDate(from)||!validDate(to)?'Usa fechas válidas con formato AAAA-MM-DD.':from&&to&&from>to?'La fecha desde debe ser anterior o igual a hasta.':'';
  const selectedPerson=people.find(person=>String(person.Id)===worker);
  const workerLabel=selectedPerson?`${selectedPerson.FirstName} ${selectedPerson.LastName}`:worker?(expenses.find(item=>String(item.UserId)===worker)?.UserName??'Integrante seleccionado'):'Todos los integrantes';
  const scoped=useMemo(()=>expenses.filter(item=>user?.role!=='ADMIN'||(scope==='personal'?item.UserId===user.id:!worker||String(item.UserId)===worker)),[expenses,user?.role,user?.id,scope,worker]);
  const visible = useMemo(() => {
    const text = search.trim().toLocaleLowerCase('es');
    return scoped.filter(item => (!reviewOnly||item.UserId!==user?.id||adminCount===1) && !dateError && (!from||item.ExpenseDate.slice(0,10)>=from)&&(!to||item.ExpenseDate.slice(0,10)<=to)&&(status === 'ALL' || item.Status === status) &&
      (!text || `${item.ReceiptNumber} ${item.ExpenseTypeName} ${item.UserName??''}`.toLocaleLowerCase('es').includes(text)));
  }, [scoped, status, search,from,to,dateError,reviewOnly,user?.id,adminCount]);
  const pending = scoped.filter(item => item.Status === 'PENDING').length;
  const approved = scoped.filter(item => item.Status === 'APPROVED').length;

  return <View style={styles.page}>
    <FlatList {...handlers} scrollEventThrottle={16} alwaysBounceVertical data={visible} keyExtractor={item => String(item.Id)} refreshing={isLoading} onRefresh={refresh}
      contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
      ListHeaderComponent={<View style={{ gap: 22, marginBottom: 16 }}>
        {control}
        <View style={styles.row}>
          <View style={{ flex: 1 }}><Text style={styles.eyebrow}>BOLETAS Y RESPALDOS</Text><Text style={styles.title}>{user?.role === 'ADMIN'&&scope==='company' ? 'Boletas de tu empresa' : 'Mis boletas'}</Text></View>
          <View style={styles.headerIcon}><Ionicons name="receipt-outline" size={25} color={Colors.primary} /></View>
        </View>
        <Text style={styles.subtitle}>{user?.role === 'ADMIN' ? 'Consulta, revisa y mantén cada gasto en orden.' : 'Cada gasto, su historia. Cada boleta, su respaldo.'}</Text>
        {user?.role==='ADMIN'?<><ExpenseScopeSelector value={scope} onChange={setScope}/><Pressable accessibilityRole="button" onPress={()=>router.push('/(protected)/(tabs)/employees')}><Text style={styles.link}>Equipo y rendiciones →</Text></Pressable><Text style={styles.sort}>{adminCount===1?'Eres el único administrador activo: tus nuevas boletas se aprueban al guardar su respaldo.':adminCount!==null?'Tus boletas deben ser revisadas por otro administrador activo.':'La política de aprobación se comprueba al guardar y revisar.'}</Text></>:null}
        <View style={styles.summary}>
          <View style={{ flex: 1 }}><Text style={styles.summaryLabel}>REGISTRO DEL ALCANCE ELEGIDO</Text><Text style={styles.summaryNumber}>{isLoading && !expenses.length ? '…' : scoped.length}</Text><Text style={styles.summaryHint}>boletas registradas · todos los períodos</Text></View>
          <View style={styles.summarySide}><Text style={styles.summarySideNumber}>{pending}</Text><Text style={styles.summaryHint}>pendientes</Text><View style={{ height: 8 }} /><Text style={styles.summarySideNumber}>{approved}</Text><Text style={styles.summaryHint}>aprobadas</Text></View>
        </View>
        <Pressable accessibilityRole="button" style={styles.primary} onPress={() => router.push('/(protected)/expenses/create')}><Ionicons name="add-circle-outline" size={21} color="white" /><Text style={styles.primaryText}>Registrar una boleta</Text></Pressable>
        <View style={styles.filterPanel}>
        <Text style={styles.filterHeading}>Filtrar boletas</Text>
        {user?.role==='ADMIN'?<View>{scope==='company'?<Pressable accessibilityRole="button" style={styles.search} onPress={()=>setChoosingWorker(true)}><Ionicons name="people-outline" size={20} color={Colors.primary}/><Text style={styles.filterText}>{workerLabel}</Text><Ionicons name="chevron-down" size={17} color={Colors.primary}/></Pressable>:null}</View>:null}
        <View style={styles.search}><Ionicons name="search-outline" size={19} color={Colors.textSecondary} /><TextInput accessibilityLabel="Buscar boletas" placeholder="Buscar por número o tipo de gasto" placeholderTextColor={Colors.textSecondary} value={search} onChangeText={setSearch} style={styles.searchInput} />{search ? <Pressable accessibilityRole="button" accessibilityLabel="Limpiar búsqueda" onPress={() => setSearch('')}><Ionicons name="close-circle" size={19} color={Colors.textSecondary} /></Pressable> : null}</View>
        {reviewOnly?<Text style={{color:'#B94141',fontSize:12,fontWeight:'600'}}>Mostrando pendientes que puedes revisar</Text>:null}
        <View style={styles.filters}>{filters.map(filter => <Pressable key={filter.value} accessibilityRole="button" accessibilityState={{ selected: status === filter.value }} onPress={() => {setStatus(filter.value);setReviewOnly(false);}} style={[styles.filter, status === filter.value && styles.selectedFilter,{flexDirection:'row',alignItems:'center',gap:6}]}><Text style={[styles.filterText, status === filter.value && { color: Colors.primary }]}>{filter.label}</Text>{filter.value==='PENDING'&&pending>0?<View accessibilityLabel={`${pending} pendientes`} style={{backgroundColor:'#DC2626',borderRadius:10,minWidth:18,paddingHorizontal:4,paddingVertical:1}}><Text style={{color:'white',fontSize:10,fontWeight:'700',textAlign:'center'}}>{pending>99?'99+':pending}</Text></View>:null}</Pressable>)}</View>
        <Text style={styles.sort}>Fecha de la boleta</Text><View style={[styles.row,{flexWrap:'wrap'}]}><ReceiptDateFilter label="Desde" value={from} onChange={setFrom}/><ReceiptDateFilter label="Hasta" value={to} onChange={setTo}/></View>
        {dateError?<Text accessibilityRole="alert" style={{color:Colors.danger}}>{dateError}</Text>:null}
        {(from||to||worker||search||status!=='ALL')?<Pressable accessibilityRole="button" onPress={()=>{setFrom('');setTo('');setWorker('');setSearch('');setStatus('ALL');setReviewOnly(false);router.setParams({workerId:undefined});}}><Text style={styles.link}>Limpiar filtros</Text></Pressable>:null}
        </View>
        <View style={styles.row}><Text style={styles.resultCount}>{visible.length} resultado{visible.length !== 1 ? 's' : ''}</Text><Text style={styles.sort}>Más recientes primero</Text></View>
        {error ? <View style={styles.error}><Text accessibilityRole="alert" style={{ color: '#991B1B' }}>{error}</Text><Pressable onPress={reload} accessibilityRole="button"><Text style={styles.link}>Reintentar →</Text></Pressable></View> : null}
      </View>}
      ListEmptyComponent={isLoading ? <ActivityIndicator color={Colors.primary} style={{ padding: 30 }} /> : !error ? <View style={styles.empty}>
        <Ionicons name="documents-outline" size={42} color="#94A3B8" /><Text style={styles.emptyTitle}>{expenses.length ? 'No hay coincidencias' : 'Tu registro comienza aquí'}</Text><Text style={styles.emptyText}>{expenses.length ? 'Prueba otro número, tipo de gasto o estado.' : 'Agrega tu primera boleta y conserva el respaldo desde el primer día.'}</Text>
      </View> : null}
      renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Ver boleta ${item.ReceiptNumber}${item.Status==='PENDING'&&!seen.has(item.Id)?', pendiente nueva':''}`} onPress={() => openExpense(item.Id)} style={styles.card}>
        <View style={styles.row}>
          <View style={styles.typeIcon}><Ionicons name={typeIcon(item.ExpenseTypeName)} size={23} color={Colors.primary} /></View>
          <View style={{ flex: 1, gap: 5 }}><Text style={styles.type} numberOfLines={1}>{item.ExpenseTypeName}</Text><Text style={styles.receiptNumber} numberOfLines={1}>N.º {item.ReceiptNumber}</Text></View>
          {item.Status==='PENDING'&&!seen.has(item.Id)?<View accessibilityLabel="Pendiente nueva, sin abrir" style={{width:10,height:10,borderRadius:5,backgroundColor:'#DC2626'}}/>:null}<ExpenseStatus status={item.Status} />
        </View>
        {item.Description ? <Text numberOfLines={1} style={styles.description}>{item.Description}</Text> : null}
        {user?.role==='ADMIN'?<Text style={styles.description}>{item.UserId===user.id?'Mi boleta':item.UserName}</Text>:null}
        <View style={styles.cardFooter}><View style={styles.date}><Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} /><Text style={styles.dateText}>{item.ExpenseDate.slice(0, 10).split('-').reverse().join('/')}</Text></View><View style={styles.date}><Text style={styles.amount}>{formatCurrency(item.TotalAmount)}</Text><Ionicons name="chevron-forward" size={18} color={Colors.primary} /></View></View>
      </Pressable>} />
    <Modal visible={choosingWorker} transparent animationType="fade" onRequestClose={()=>setChoosingWorker(false)}><View style={{flex:1,backgroundColor:'#17233D88',justifyContent:'center',padding:22}}><View style={{backgroundColor:'white',borderRadius:22,padding:22,gap:16,maxHeight:'80%'}}><Text style={styles.emptyTitle}>Filtrar por integrante</Text><ScrollView><Pressable accessibilityRole="button" onPress={()=>{setWorker('');setChoosingWorker(false);}} style={{padding:15}}><Text style={styles.link}>Todos los integrantes</Text></Pressable>{people.map(person=><Pressable key={person.Id} accessibilityRole="button" onPress={()=>{setWorker(String(person.Id));setChoosingWorker(false);}} style={{padding:15}}><Text style={styles.filterText}>{person.FirstName} {person.LastName}{person.Id===user?.id?' · Yo':''}</Text></Pressable>)}</ScrollView><Pressable accessibilityRole="button" onPress={()=>setChoosingWorker(false)}><Text style={styles.link}>Cerrar</Text></Pressable></View></View></Modal>
  </View>;
}

const styles = StyleSheet.create({
  filterPanel:{backgroundColor:'#EDF3F7',padding:16,borderRadius:18,gap:13,borderWidth:1,borderColor:Colors.border},
  filterHeading:{fontSize:14,fontWeight:'700',color:Colors.text},
  page: { flex: 1, backgroundColor: Colors.background },
  content: { width: '100%', maxWidth: 900, alignSelf: 'center', padding: 20, paddingBottom: 105 },
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
