import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { ExpenseDetail, VatSource } from '@/api/expense.api';
import { API_URL, authorized, jsonBody, requestJson } from '@/api/http';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Text from '@/components/ui/Text';
import { Banner, Card, SectionTitle, Segmented, Sheet, styles as kit } from '@/components/ui/kit';
import { expenseTypeOf } from '@/constants/expenseTypes';
import { Colors } from '@/theme';
import { amountDigits, formatCurrency, groupDigits } from '@/utils/currency';
import { dateTime, shortDate } from '@/utils/dates';
import { todayReceiptDate } from '@/utils/receiptDate';
import ReceiptDateFilter from './ReceiptDateFilter';

interface Entry { Id: number; Action: string; Actor: string | null; CreatedAt: string; BeforeData: string | null; AfterData: string | null; Reason: string | null }

const actions: Record<string, string> = {
  AUTO_APPROVE_SOLE_ADMIN: 'Aprobación automática (único administrador)', SELF_APPROVE_EXPENSE: 'Confirmación propia (único administrador)',
  CORRECT_EXPENSE: 'Corrección administrativa', UPDATE_EXPENSE: 'Edición', ROLLBACK_EXPENSE: 'Edición revertida',
  APPROVE_EXPENSE: 'Aprobación', REJECT_EXPENSE: 'Rechazo', SOFT_DELETE_EXPENSE: 'Boleta retirada',
};
const vatNames: Record<string, string> = { CALCULATED: '19% incluido', RECEIPT: 'impreso', EXEMPT: 'exento', NOT_STATED: 'no informado' };
const snapshot = (json: string | null) => { try { return json ? JSON.parse(json) as Record<string, unknown> : null; } catch { return null; } };

/** Solo lo que cambió, en palabras. */
export function describeChanges(before: Record<string, unknown> | null, after: Record<string, unknown> | null) {
  if (!before || !after) return [];
  const money = (value: unknown) => formatCurrency(Number(value));
  const fields: [string, string, (value: unknown) => string][] = [
    ['ExpenseDate', 'Fecha', value => shortDate(String(value))], ['TotalAmount', 'Total', money], ['VatAmount', 'IVA', money],
    ['VatSource', 'Origen del IVA', value => vatNames[String(value)] ?? String(value)], ['ReceiptNumber', 'Número', String],
    ['DocumentType', 'Documento', value => value === 'FACTURA' ? 'Factura' : 'Boleta'],
    ['ExpenseTypeId', 'Tipo', value => expenseTypeOf(Number(value))?.name ?? String(value)],
    ['SupplierId', 'Comercio', value => value ? 'otro comercio' : 'sin comercio'], ['Description', 'Descripción', value => value ? String(value) : 'vacía'],
  ];
  return fields.filter(([key]) => key in after && before[key] !== undefined && before[key] !== after[key] || (key in after && !(key in before) && key !== 'VatSource' && key !== 'DocumentType'))
    .map(([key, label, show]) => key === 'SupplierId' ? 'Comercio modificado' : `${label}: ${before[key] === undefined ? '—' : show(before[key])} → ${show(after[key])}`);
}

export default function ExpenseHistory({ expense, token, admin, onChanged }: { expense: ExpenseDetail; token: string; admin: boolean; onChanged: () => void }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [vatSource, setVatSource] = useState<VatSource>('CALCULATED');
  const [vat, setVat] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const url = `${API_URL}/expenses/${expense.Id}`;

  useEffect(() => {
    let active = true;
    requestJson(`${url}/history`, { headers: authorized(token) }).then(result => { if (active) setEntries(result.history); }).catch(() => { if (active) setError('No fue posible cargar el historial.'); });
    return () => { active = false; };
  }, [url, token]);

  function start() {
    setDate(expense.ExpenseDate.slice(0, 10));
    setAmount(String(Number(expense.TotalAmount)));
    setVatSource(expense.VatSource);
    setVat(expense.VatSource === 'RECEIPT' ? String(Number(expense.VatAmount)) : '');
    setReason('');
    setError('');
    setEditing(true);
  }
  async function run(path: string, body?: unknown) {
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await requestJson(`${url}/${path}`, body ? jsonBody(token, body) : { method: 'POST', headers: authorized(token) }, 90000);
      setMessage(result.message);
      setEditing(false);
      onChanged();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'No fue posible guardar.'); }
    finally { setBusy(false); }
  }
  function save() {
    if (!reason.trim()) { setError('Escribe el motivo de la corrección.'); return; }
    if (!Number(amount)) { setError('El total debe ser mayor que cero.'); return; }
    if (vatSource === 'RECEIPT' && !Number(vat)) { setError('Copia el IVA que muestra el documento.'); return; }
    void run('corrections', {
      expenseDate: date, totalAmount: Number(amount), reason, expectedDate: expense.ExpenseDate.slice(0, 10), expectedAmount: Number(expense.TotalAmount),
      vatSource, ...(vatSource === 'RECEIPT' ? { vatAmount: Number(vat) } : {}),
    });
  }

  return <Card>
    <SectionTitle title="Historial" />
    {expense.DriveSyncPending && admin ? <Banner tone="warning" action={<Button compact variant="secondary" title="Reintentar sincronización" loading={busy} style={{ alignSelf: 'flex-start' }} onPress={() => { void run('sync'); }} />}>El respaldo de la foto está pendiente.</Banner> : null}
    {message ? <Banner tone="success">{message}</Banner> : null}
    {error && !editing ? <Banner tone="danger">{error}</Banner> : null}
    {entries.map(entry => <View key={entry.Id} style={s.entry}>
      <View style={s.dot} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ fontWeight: '700', fontSize: 14 }}>{actions[entry.Action] ?? entry.Action}</Text>
        <Text style={kit.caption}>{entry.Actor ?? 'Usuario registrado'} · {dateTime(entry.CreatedAt)}</Text>
        {entry.Reason ? <Text style={{ fontSize: 13, lineHeight: 19, color: Colors.textSecondary }}>{entry.Reason}</Text> : null}
        {describeChanges(snapshot(entry.BeforeData), snapshot(entry.AfterData)).map(change => <Text key={change} style={{ fontSize: 13, lineHeight: 19 }}>{change}</Text>)}
      </View>
    </View>)}
    {!entries.length && !error ? <Text style={kit.subtitle}>Aún no hay movimientos.</Text> : null}
    {admin && expense.Status === 'APPROVED' && !expense.DriveSyncPending ? <Button variant="ghost" icon="construct-outline" title="Corregir fecha, total o IVA" onPress={start} /> : null}

    <Sheet visible={editing} title="Corrección administrativa" onClose={() => { if (!busy) setEditing(false); }}
      footer={<View style={{ flexDirection: 'row', gap: 10 }}><Button title="Cancelar" variant="secondary" style={{ flex: 1 }} disabled={busy} onPress={() => setEditing(false)} /><Button title="Guardar" style={{ flex: 1 }} loading={busy} onPress={save} /></View>}>
      <Text style={kit.subtitle}>La boleta sigue aprobada. Quedan registrados tu nombre, el motivo y los valores anteriores.</Text>
      <ReceiptDateFilter field label="Fecha de la boleta" value={date} onChange={setDate} clearable={false} maxDate={todayReceiptDate()} />
      <Input label="Total" prefix="$" value={groupDigits(amount)} onChangeText={text => setAmount(amountDigits(text))} keyboardType="number-pad" />
      <Segmented label="IVA" value={vatSource} onChange={setVatSource} options={[{ value: 'CALCULATED', label: '19%' }, { value: 'RECEIPT', label: 'Impreso' }, { value: 'EXEMPT', label: 'Exenta' }, { value: 'NOT_STATED', label: 'No indica' }]} />
      {vatSource === 'RECEIPT' ? <Input label="IVA impreso" prefix="$" value={groupDigits(vat)} onChangeText={text => setVat(amountDigits(text))} keyboardType="number-pad" /> : null}
      <Input label="Motivo (obligatorio)" value={reason} onChangeText={setReason} multiline maxLength={1000} />
      {error ? <Banner tone="danger">{error}</Banner> : null}
    </Sheet>
  </Card>;
}

const s = StyleSheet.create({
  entry: { flexDirection: 'row', gap: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5, backgroundColor: Colors.brand },
});
