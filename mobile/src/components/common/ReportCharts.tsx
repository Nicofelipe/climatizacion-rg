import { Colors } from '@/theme';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Text from '@/components/ui/Text';
import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';
import { chartPalette as dashboardPalette } from '@/theme/colors';
import { fontFor } from '@/theme/typography';
import { formatCurrency } from '@/utils/currency';
import ChartEntrance from './ChartEntrance';

const SANS = fontFor('500', 11);
export const percentText = (value: number) => `${value.toLocaleString('es-CL', { maximumFractionDigits: 1 })}%`;
export const percent = (value: number, total: number) => total > 0 ? Math.round(value / total * 1000) / 10 : 0;
const chartPress=(handler:()=>void)=>Platform.OS==='web'?{onClick:handler}:{onPress:handler};

export function ExpenseDonut({ categories, total }: { categories: { name: string; amount: number; count: number }[]; total: number }) {
 return <ChartEntrance>{progress=><DonutChart categories={categories} total={total} progress={progress}/>}</ChartEntrance>;
}
function DonutChart({categories,total,progress}:{categories:{name:string;amount:number;count:number}[];total:number;progress:number}){
  const [selected, setSelected] = useState<number | null>(null);
  const active = selected !== null ? categories[selected] : null;
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const largest=Math.max(0,...categories.map(item=>item.amount));
  let offset = 0;
  return <View style={{ gap: 22 }}>
    <View style={{ alignItems: 'center' }}>
      <Svg width={220} height={220} viewBox="0 0 220 220" accessibilityLabel="Distribución del monto por tipo de gasto">
        <Circle cx={110} cy={110} r={radius} fill="none" stroke={Colors.border} strokeWidth={27} />
        <G transform="rotate(-90 110 110)">{categories.map((category, index) => {
          if (category.amount <= 0) return null;
          const length = total > 0 ? category.amount / total * circumference * progress : 0;
          const start = offset; offset += length;
          return <Circle key={category.name} cx={110} cy={110} r={radius} fill="none" stroke={dashboardPalette[index % dashboardPalette.length]}
            strokeWidth={selected === index ? 35 : category.amount===largest ? 31 : 25} strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-start}
            opacity={selected === null || selected === index ? 1 : 0.45} {...chartPress(() => setSelected(selected === index ? null : index))} />;
        })}</G>
        <SvgText x={110} y={105} textAnchor="middle" fill={Colors.text} fontSize={26} fontFamily={fontFor('800', 26)}>{active ? percentText(percent(active.amount, total)) : total > 0 ? '100%' : '0%'}</SvgText>
        <SvgText x={110} y={128} textAnchor="middle" fill={Colors.textMuted} fontSize={11} fontFamily={SANS}>{active ? 'del gasto del período' : 'gasto distribuido'}</SvgText>
      </Svg>
    </View>
    {categories.length ? categories.map((category, index) => <Pressable key={category.name} accessibilityRole="button" accessibilityLabel={`${category.name}, ${percent(category.amount, total)} por ciento, ${formatCurrency(category.amount)}`} onPress={() => setSelected(selected === index ? null : index)} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', borderRadius: 12, padding: 10, backgroundColor: selected === index ? Colors.surfaceMuted : 'transparent' }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dashboardPalette[index % dashboardPalette.length] }} />
      <View style={{ flex: 1, gap: 4 }}><Text style={{ fontSize: 13, color: Colors.text, fontWeight: '600' }}>{category.name}</Text><Text style={{ fontSize: 11, color: Colors.textMuted }}>{category.count} boleta{category.count !== 1 ? 's' : ''}</Text></View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}><Text style={{ color: Colors.text, fontWeight: '700', fontSize: 13 }}>{formatCurrency(category.amount)}</Text><Text style={{ color: Colors.textMuted, fontSize: 12 }}>{percentText(percent(category.amount, total))}</Text></View>
    </Pressable>) : <Text style={{ color: Colors.textMuted, textAlign: 'center', lineHeight: 22 }}>No hay gastos para distribuir en este período.</Text>}
  </View>;
}

export interface LinePoint { key: string; label: string; description: string; amount: number }
export function ExpenseLine({ points }: { points: LinePoint[] }) {
 return <ChartEntrance>{progress=><LineChart points={points} progress={progress}/>}</ChartEntrance>;
}
function LineChart({ points, progress }: { points: LinePoint[]; progress: number }) {
  const [selection, setSelection] = useState<number | null>(null);
  const [width, setWidth] = useState(640);
  const height = 230, left = 52, bottom = 196, top = 16;
  const max = Math.max(1, ...points.map(point => point.amount));
  const hasData = points.some(point => point.amount > 0);
  const step = (width - left - 8) / Math.max(1, points.length);
  const bar = Math.max(3, Math.min(34, step * 0.62));
  const y = (amount: number) => bottom - amount / max * (bottom - top);
  const peak = points.reduce<LinePoint | null>((best, point) => point.amount > (best?.amount ?? 0) ? point : best, null);
  const active = selection !== null ? points[selection] : null;
  const every = Math.max(1, Math.ceil(points.length / (width < 420 ? 6 : 12)));
  return <View style={{ gap: 10 }} onLayout={event => setWidth(Math.max(260, event.nativeEvent.layout.width))}>
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} accessibilityLabel="Evolución del gasto en el período">
      {[0, 0.5, 1].map(fraction => <G key={fraction}>
        <Line x1={left} x2={width} y1={y(max * fraction)} y2={y(max * fraction)} stroke={Colors.border} strokeDasharray={fraction ? '4 5' : undefined} />
        <SvgText x={left - 8} y={y(max * fraction) + 4} fill={Colors.textMuted} fontSize={11} fontFamily={SANS} textAnchor="end">{hasData ? new Intl.NumberFormat('es-CL', { notation: 'compact', maximumFractionDigits: 1 }).format(max * fraction) : fraction ? '' : '0'}</SvgText>
      </G>)}
      {points.map((point, index) => {
        const x = left + step * index + step / 2, size = (bottom - y(point.amount)) * progress;
        return <G key={point.key}>
          {point.amount > 0 ? <Rect x={x - bar / 2} y={bottom - Math.max(3, size)} width={bar} height={Math.max(3, size)} rx={Math.min(5, bar / 2)} fill={selection === index ? Colors.accent : point === peak ? Colors.primary : '#7CC4C1'} /> : null}
          {index % every === 0 ? <SvgText x={x} y={216} fill={Colors.textMuted} fontSize={11} fontFamily={SANS} textAnchor="middle">{point.label}</SvgText> : null}
          <Rect x={x - step / 2} y={top} width={step} height={bottom - top} fill="transparent" {...chartPress(() => setSelection(selection === index ? null : index))} />
        </G>;
      })}
    </Svg>
    <View style={{ backgroundColor: Colors.surfaceMuted, borderRadius: 12, padding: 13, flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ color: Colors.textMuted, fontSize: 13, flex: 1 }}>{active?.description ?? (peak ? `Mayor gasto: ${peak.description}` : 'Sin gasto en el período')}</Text>
      <Text style={{ fontWeight: '700', fontSize: 14, color: Colors.primaryText }}>{formatCurrency(active?.amount ?? peak?.amount ?? 0)}</Text>
    </View>
  </View>;
}
