import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Button from '@/components/ui/Button';
import Text from '@/components/ui/Text';
import { Sheet } from '@/components/ui/kit';
import { BorderRadius, Colors } from '@/theme';
import { readableDate, shortDate } from '@/utils/dates';
import { availablePeriodOptions } from '@/utils/periodOptions';
import { todayReceiptDate, validReceiptDate } from '@/utils/receiptDate';
import DashboardPeriodSelector from './DashboardPeriodSelector';

interface Props {
  label: string; value: string; onChange: (value: string) => void; clearable?: boolean; maxDate?: string; minDate?: string;
  /** Aspecto de campo de formulario, con etiqueta arriba. */
  field?: boolean; error?: string; badge?: ReactNode;
}

export default function ReceiptDateFilter({ label, value, onChange, clearable = true, maxDate, minDate, field, error, badge }: Props) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(availablePeriodOptions(0).currentPeriod);
  const [year, number] = month.split('-').map(Number);
  const offset = (new Date(Date.UTC(year, number - 1, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, number, 0)).getUTCDate();
  const today = todayReceiptDate();
  const choose = (date: string) => { onChange(date); setOpen(false); };
  function show() {
    setMonth(validReceiptDate(value) && (!maxDate || value <= maxDate) ? value.slice(0, 7) : availablePeriodOptions(0).currentPeriod);
    setOpen(true);
  }
  return <View style={field ? { gap: 7 } : { flex: 1, minWidth: 140 }}>
    {field ? <View style={s.labelRow}><Text style={s.label}>{label}</Text>{badge}</View> : null}
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value ? shortDate(value) : 'sin seleccionar'}`} onPress={show} style={[s.box, error ? { borderColor: Colors.danger } : null]}>
      <Ionicons name="calendar-outline" size={19} color={Colors.textMuted} />
      <Text style={{ flex: 1, fontSize: field ? 16 : 14, color: value ? Colors.text : Colors.placeholder }}>{value ? field ? readableDate(value) : shortDate(value) : field ? 'Elegir fecha' : label}</Text>
      <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
    </Pressable>
    {error ? <Text accessibilityRole="alert" style={{ color: Colors.danger, fontSize: 12, lineHeight: 17 }}>{error}</Text> : null}
    <Sheet visible={open} title={label} onClose={() => setOpen(false)}>
      <DashboardPeriodSelector value={month} onChange={setMonth} />
      <View style={s.grid}>
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, index) => <Text key={`h${index}`} style={s.weekday}>{day}</Text>)}
        {Array.from({ length: offset }, (_, index) => <View key={`b${index}`} style={s.cell} />)}
        {Array.from({ length: count }, (_, index) => {
          const date = `${month}-${String(index + 1).padStart(2, '0')}`;
          const disabled = Boolean((maxDate && date > maxDate) || (minDate && date < minDate)), selected = date === value;
          return <Pressable disabled={disabled} key={date} accessibilityRole="button" accessibilityLabel={`Elegir ${shortDate(date)}`} aria-selected={selected} aria-disabled={disabled} onPress={() => choose(date)} style={[s.cell, { opacity: disabled ? 0.28 : 1 }]}>
            <View style={[s.day, selected && { backgroundColor: Colors.primary }, !selected && date === today && { backgroundColor: Colors.primarySoft }]}><Text style={{ fontSize: 14, fontWeight: selected || date === today ? '700' : '500', color: selected ? Colors.white : Colors.text }}>{index + 1}</Text></View>
          </Pressable>;
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="Hoy" compact variant="secondary" style={{ flex: 1 }} onPress={() => choose(today)} />
        {clearable ? <Button title="Quitar fecha" compact variant="ghost" style={{ flex: 1 }} onPress={() => choose('')} /> : null}
      </View>
    </Sheet>
  </View>;
}

const s = StyleSheet.create({
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 20 },
  label: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  box: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 50, paddingHorizontal: 14, borderRadius: BorderRadius.control, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: '14.2857%', textAlign: 'center', paddingVertical: 8, color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
  cell: { width: '14.2857%', height: 44, alignItems: 'center', justifyContent: 'center' },
  day: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
