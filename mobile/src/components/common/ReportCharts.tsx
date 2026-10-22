import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Line, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { dashboardPalette } from './DashboardOverview.styles';
import { formatCurrency } from '@/utils/currency';

export const percent = (value: number, total: number) => total > 0 ? Math.round(value / total * 1000) / 10 : 0;

export function ExpenseDonut({ categories, total }: { categories: { name: string; amount: number; count: number }[]; total: number }) {
  const [selected, setSelected] = useState<number | null>(null);
  const active = selected !== null ? categories[selected] : null;
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return <View style={{ gap: 22 }}>
    <View style={{ alignItems: 'center' }}>
      <Svg width={220} height={220} viewBox="0 0 220 220" accessibilityLabel="Distribución del monto por tipo de gasto">
        <Circle cx={110} cy={110} r={radius} fill="none" stroke="#EEF2F7" strokeWidth={27} />
        <G transform="rotate(-90 110 110)">{categories.map((category, index) => {
          if (category.amount <= 0) return null;
          const length = total > 0 ? category.amount / total * circumference : 0;
          const start = offset; offset += length;
          return <Circle key={category.name} cx={110} cy={110} r={radius} fill="none" stroke={dashboardPalette[index % dashboardPalette.length]}
            strokeWidth={selected === index ? 33 : 27} strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-start}
            opacity={selected === null || selected === index ? 1 : 0.45} onPress={() => setSelected(selected === index ? null : index)} />;
        })}</G>
        <SvgText x={110} y={105} textAnchor="middle" fill="#17233D" fontSize={25} fontWeight="700">{active ? `${percent(active.amount, total)}%` : total > 0 ? '100%' : '0%'}</SvgText>
        <SvgText x={110} y={128} textAnchor="middle" fill="#64748B" fontSize={11}>{active ? 'del gasto del período' : 'gasto distribuido'}</SvgText>
      </Svg>
    </View>
    {categories.length ? categories.map((category, index) => <Pressable key={category.name} accessibilityRole="button" accessibilityLabel={`${category.name}, ${percent(category.amount, total)} por ciento, ${formatCurrency(category.amount)}`} onPress={() => setSelected(selected === index ? null : index)} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', borderRadius: 12, padding: 10, backgroundColor: selected === index ? '#F1F5F9' : 'transparent' }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dashboardPalette[index % dashboardPalette.length] }} />
      <View style={{ flex: 1, gap: 4 }}><Text style={{ fontSize: 13, color: '#334155', fontWeight: '600' }}>{category.name}</Text><Text style={{ fontSize: 11, color: '#64748B' }}>{category.count} boleta{category.count !== 1 ? 's' : ''}</Text></View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}><Text style={{ color: '#17233D', fontWeight: '700', fontSize: 13 }}>{formatCurrency(category.amount)}</Text><Text style={{ color: '#64748B', fontSize: 12 }}>{percent(category.amount, total)}%</Text></View>
    </Pressable>) : <Text style={{ color: '#64748B', textAlign: 'center', lineHeight: 22 }}>No hay gastos para distribuir en este período.</Text>}
  </View>;
}

export interface LinePoint { key: string; label: string; description: string; amount: number }
export function ExpenseLine({ points }: { points: LinePoint[] }) {
  const [selection, setSelection] = useState<number | null>(null);
  const max = Math.max(1, ...points.map(point => point.amount));
  const x = (index: number) => points.length <= 1 ? 330 : 60 + index / (points.length - 1) * 555;
  const y = (amount: number) => 185 - amount / max * 155;
  const line = points.map((point, index) => `${index ? 'L' : 'M'} ${x(index)} ${y(point.amount)}`).join(' ');
  const area = points.length ? `${line} L ${x(points.length - 1)} 185 L ${x(0)} 185 Z` : '';
  const active = selection !== null ? points[selection] : null;
  return <View style={{ gap: 10 }}>
    <Svg width="100%" height={235} viewBox="0 0 640 225" accessibilityLabel="Evolución del gasto en el período">
      <Defs><LinearGradient id="reportArea" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#0D9488" stopOpacity={0.22} /><Stop offset="1" stopColor="#0D9488" stopOpacity={0.015} /></LinearGradient></Defs>
      {[0, 0.5, 1].map(fraction => <G key={fraction}><Line x1={60} x2={615} y1={y(max * fraction)} y2={y(max * fraction)} stroke="#E7EDF5" strokeDasharray="4 5" /><SvgText x={50} y={y(max * fraction) + 4} fill="#7C899D" fontSize={10} textAnchor="end">{new Intl.NumberFormat('es-CL', { notation: 'compact', maximumFractionDigits: 1 }).format(max === 1 && !points.some(p => p.amount > 0) ? 0 : max * fraction)}</SvgText></G>)}
      {area ? <Path d={area} fill="url(#reportArea)" /> : null}
      {line ? <Path d={line} stroke="#0D9488" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" fill="none" /> : null}
      {points.map((point, index) => <G key={point.key}>
        {(index === 0 || index === points.length - 1 || index % Math.max(1, Math.ceil(points.length / 7)) === 0) ? <SvgText x={x(index)} y={210} fill="#7C899D" fontSize={10} textAnchor="middle">{point.label}</SvgText> : null}
        <Circle cx={x(index)} cy={y(point.amount)} r={selection === index ? 7 : points.length <= 12 ? 5 : 3.5} fill={selection === index ? '#17233D' : '#0D9488'} stroke="white" strokeWidth={1.5} />
        <Rect x={x(index) - Math.max(6, 555 / Math.max(1, points.length) / 2)} y={12} width={Math.max(12, 555 / Math.max(1, points.length))} height={180} fill="transparent" onPress={() => setSelection(index)} />
      </G>)}
    </Svg>
    <View style={{ backgroundColor: '#F4F8F8', borderRadius: 12, padding: 13, flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ color: '#64748B', fontSize: 12, flex: 1 }}>{active?.description ?? 'Toca un punto para ver su importe'}</Text><Text style={{ fontWeight: '700', fontSize: 13, color: '#0F8277' }}>{active ? formatCurrency(active.amount) : 'CLP'}</Text>
    </View>
  </View>;
}
