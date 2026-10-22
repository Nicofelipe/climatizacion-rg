import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { availablePeriodOptions } from '@/utils/periodOptions';

const months = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1).padStart(2, '0'),
  label: new Date(Date.UTC(2026, index, 15)).toLocaleDateString('es-CL', { month: 'long', timeZone: 'America/Santiago' }),
}));

export default function DashboardPeriodSelector({ value, onChange, hideMonth = false }: { value: string; onChange: (value: string) => void; hideMonth?: boolean }) {
  const [field, setField] = useState<'year' | 'month'>('year');
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [year, month] = value.split('-');
  const { currentYear, currentMonth, currentPeriod, years, months: allowedMonths } = availablePeriodOptions(Number(year));
  const availableMonths = months.filter(item => allowedMonths.includes(item.value));
  const options = field === 'year' ? years.filter(item => item.includes(search)).map(item => ({ value: item, label: item })) : availableMonths;
  const selected = field === 'year' ? year : month;
  useEffect(() => { if (value > currentPeriod) onChange(currentPeriod); }, [value, currentPeriod, onChange]);
  function open(next: 'year' | 'month') { setSearch(''); setField(next); setVisible(true); }
  function choose(next: string) {
    const nextMonth = Number(next) === currentYear && month > currentMonth ? currentMonth : month;
    onChange(field === 'year' ? `${next}-${nextMonth}` : `${year}-${next}`);
    setVisible(false);
  }

  return <>
    <View style={styles.fields}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Elegir año, actual ${year}`} style={styles.field} onPress={() => open('year')}>
        <Text style={styles.caption}>AÑO</Text><View style={styles.row}><Text style={styles.value}>{year}</Text><Ionicons name="chevron-down" size={15} color="#64748B" /></View>
      </Pressable>
      {!hideMonth ? <Pressable accessibilityRole="button" accessibilityLabel={`Elegir mes, actual ${months.find(item => item.value === month)?.label}`} style={[styles.field, { minWidth: 150 }]} onPress={() => open('month')}>
        <Text style={styles.caption}>MES</Text><View style={styles.row}><Text style={[styles.value, { textTransform: 'capitalize' }]}>{months.find(item => item.value === month)?.label}</Text><Ionicons name="chevron-down" size={15} color="#64748B" /></View>
      </Pressable> : null}
    </View>
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
      <View style={styles.overlay}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar selector" style={StyleSheet.absoluteFill} onPress={() => setVisible(false)} />
        <View style={styles.dialog} accessibilityViewIsModal>
          <View style={styles.row}><Text style={styles.title}>{field === 'year' ? 'Elige el año' : 'Elige el mes'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Cancelar selección" onPress={() => setVisible(false)} style={{ padding: 8 }}><Ionicons name="close" size={22} color="#475569" /></Pressable></View>
          {field === 'year' ? <TextInput accessibilityLabel="Buscar año" placeholder="Escribe un año, por ejemplo 2020" keyboardType="number-pad" maxLength={4} value={search} onChangeText={text => setSearch(text.replace(/\D/g, ''))} style={styles.search} /> : null}
          <FlatList key={field} data={options} keyExtractor={item => item.value} keyboardShouldPersistTaps="handled" style={{ maxHeight: 350 }}
            ListEmptyComponent={<Text style={{ padding: 16, color: '#64748B' }}>No hay años que coincidan.</Text>}
            renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityState={{ selected: item.value === selected }} accessibilityLabel={item.label} onPress={() => choose(item.value)} style={[styles.option, item.value === selected && { backgroundColor: '#E7F5F1' }]}>
              <Text style={[styles.optionText, item.value === selected && { color: '#0F8277', fontWeight: '700' }]}>{item.label}</Text>
              {item.value === selected ? <Ionicons name="checkmark" size={18} color="#0F8277" /> : null}
            </Pressable>} />
        </View>
      </View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  fields: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  field: { backgroundColor: 'white', borderWidth: 1, borderColor: '#E4E9F2', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, minWidth: 105, gap: 4 },
  caption: { fontSize: 9, color: '#64748B', fontWeight: '700', letterSpacing: 1.2 },
  value: { fontSize: 14, color: '#17233D', fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', padding: 24, justifyContent: 'center', alignItems: 'center' },
  dialog: { width: '100%', maxWidth: 420, maxHeight: '85%', padding: 20, backgroundColor: 'white', borderRadius: 22, gap: 14 },
  title: { fontSize: 22, fontWeight: '700', color: '#17233D' },
  search: { backgroundColor: '#F4F6FA', borderColor: '#E4E9F2', borderWidth: 1, borderRadius: 12, padding: 13, fontSize: 14, color: '#17233D' },
  option: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, borderRadius: 10 },
  optionText: { color: '#334155', fontSize: 15, textTransform: 'capitalize' },
});
