import { useCallback, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { ExpenseDetail, getExpenseApi, getExpenseImageApi, reviewExpensesApi } from '@/api/expense.api';
import Input from '@/components/ui/Input';
import AppContainer from '@/components/layout/AppContainer';
import Button from '@/components/ui/Button';
import ExpenseStatus from '@/components/common/ExpenseStatus';
import ExpenseHistory from '@/components/common/ExpenseHistory';
import { useAuth } from '@/hooks/useAuth';
import { Colors, Spacing } from '@/theme';
import { formatCurrency } from '@/utils/currency';

export default function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user } = useAuth();
  const [expense, setExpense] = useState<ExpenseDetail | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageError, setImageError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [reason, setReason] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED' | null>(null);

  async function confirmReview() {
    if (!token || !decision || reviewing) return;
    setReviewError('');
    if (decision === 'REJECTED' && !reason.trim()) { setReviewError('Indica por qué se rechaza la boleta.'); return; }
    setReviewing(true);
    try {
      await reviewExpensesApi(token, [Number(id)], decision, reason);
      setDecision(null); setAttempt(value => value + 1);
    } catch (err) { setReviewError(err instanceof Error ? err.message : 'No fue posible guardar la revisión.'); }
    finally { setReviewing(false); }
  }

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true); setError(''); setImage(null); setImageError(''); setExpense(null);
    if (!token || !/^\d+$/.test(id ?? '')) { setError('Boleta no disponible.'); setLoading(false); return; }
    getExpenseApi(token, Number(id)).then(async data => {
      if (!active) return;
      setExpense(data); setLoading(false);
      if (!data.file) return;
      setImageLoading(true);
      try {
        const uri = await getExpenseImageApi(token, Number(id));
        if (active) setImage(uri);
      } catch (err) { if (active) setImageError(err instanceof Error ? err.message : 'No fue posible cargar la foto.'); }
      finally { if (active) setImageLoading(false); }
    }).catch(err => { if (active) { setError(err instanceof Error ? err.message : 'Boleta no disponible.'); setLoading(false); } });
    return () => { active = false; };
  }, [id, token, attempt]));

  const row = (label: string, value: string) => <View style={{ gap: 4 }} key={label}>
    <Text style={{ color: Colors.textSecondary, fontSize: 13 }}>{label}</Text>
    <Text selectable style={{ color: Colors.text, fontSize: 16 }}>{value}</Text>
  </View>;
  return <AppContainer>
    <ScrollView contentContainerStyle={{ gap: Spacing.lg, paddingBottom: 32 }}>
      <Pressable onPress={() => router.replace('/(protected)/(tabs)/expenses')} accessibilityRole="button"><Text style={{ color: Colors.primary }}>← Volver a boletas</Text></Pressable>
      <Text style={{ fontSize: 28, fontWeight: '700', color: Colors.text }}>Detalle de boleta</Text>
      {loading ? <ActivityIndicator /> : error ? <>
        <Text accessibilityRole="alert" style={{ color: Colors.danger }}>{error}</Text>
        <Button title="Reintentar" onPress={() => setAttempt(value => value + 1)} />
      </> : expense ? <>
        <View style={{ backgroundColor: Colors.surface, borderRadius: 20, padding: Spacing.lg, gap: Spacing.md }}>
          <ExpenseStatus status={expense.Status} />
          <Text style={{ fontSize: 32, fontWeight: '700', color: Colors.primary }}>{formatCurrency(expense.TotalAmount)}</Text>
          {row('Número de boleta', expense.ReceiptNumber)}
          {row('Identificador del registro', String(expense.Id))}
          {row('Fecha de la boleta', expense.ExpenseDate.slice(0, 10))}
          {row('Tipo de gasto', expense.ExpenseTypeName)}
          {row('Proveedor', expense.SupplierName ?? 'Sin proveedor registrado')}
          {row('Monto neto', formatCurrency(expense.NetAmount))}
          {row('IVA', formatCurrency(expense.VatAmount))}
          {row('Descripción', expense.Description || 'Sin descripción')}
          {row('Fecha de registro', new Date(expense.CreatedAt).toLocaleString('es-CL'))}
          {expense.Status === 'REJECTED' ? row('Motivo del rechazo', expense.RejectionReason ?? 'Sin motivo registrado en este registro anterior.') : null}
          {expense.ReviewedAt ? row('Fecha de revisión', new Date(expense.ReviewedAt.endsWith('Z') ? expense.ReviewedAt : `${expense.ReviewedAt}Z`).toLocaleString('es-CL')) : null}
          {expense.ReviewedByName ? row('Revisada por', expense.ReviewedByName) : null}
        </View>
        <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.text }}>Fotografía de respaldo</Text>
        {imageLoading ? <ActivityIndicator /> : image ? <Pressable onPress={() => setExpanded(true)} accessibilityRole="button" accessibilityLabel="Ampliar fotografía">
          <Image source={{ uri: image }} style={{ width: '100%', height: 360, backgroundColor: '#E5E7EB', borderRadius: 16 }} resizeMode="contain" onError={() => setImageError('No fue posible mostrar este formato de imagen.')} />
          <Text style={{ color: Colors.primary, marginTop: 8 }}>Toca para ampliar</Text>
        </Pressable> : !expense.file ? <Text>No hay una imagen asociada a este registro.</Text> : null}
        {imageError ? <><Text accessibilityRole="alert" style={{ color: Colors.danger }}>{imageError}</Text><Button title="Reintentar imagen" onPress={() => setAttempt(value => value + 1)} /></> : null}
        {token ? <ExpenseHistory key={`${expense.Id}-${attempt}`} id={expense.Id} token={token} admin={user?.role === 'ADMIN'} date={expense.ExpenseDate} amount={expense.TotalAmount} syncPending={expense.DriveSyncPending} onChanged={() => setAttempt(value => value + 1)} /> : null}
        {expense.Status === 'PENDING' && !expense.DriveSyncPending ? <>
          <Text style={{ color: Colors.textSecondary }}>Puedes modificar esta boleta mientras esté pendiente.</Text>
          <Button title="Editar boleta" onPress={() => router.push({ pathname: '/(protected)/expenses/create', params: { editId: expense.Id } })} />
        </> : <Text style={{ color: Colors.textSecondary }}>{user?.role === 'ADMIN' ? 'Las correcciones de fecha o monto se realizan con motivo e historial, conservando el estado de revisión.' : expense.Status === 'REJECTED' ? 'Esta boleta fue rechazada y no se puede modificar. Debes ingresar una nueva boleta.' : 'Esta boleta no está disponible para edición del trabajador.'}</Text>}
        {expense.Status === 'REJECTED' ? <Button title="Registrar nuevamente" onPress={() => router.push('/(protected)/expenses/create')} /> : null}
        {user?.role === 'ADMIN' && expense.Status === 'PENDING' ? <View style={{ backgroundColor: Colors.surface, padding: Spacing.lg, borderRadius: 16, gap: Spacing.md }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.text }}>Revisión del administrador</Text>
          {decision ? <>
            <Text style={{ color: Colors.text }}>¿Confirmas {decision === 'APPROVED' ? 'aprobar' : 'rechazar'} esta boleta? El trabajador ya no podrá modificarla. Una corrección administrativa exigirá motivo e historial.</Text>
            {decision === 'REJECTED' ? <Input label="Motivo del rechazo (obligatorio)" value={reason} onChangeText={setReason} /> : null}
            {reviewError ? <Text accessibilityRole="alert" style={{ color: Colors.danger }}>{reviewError}</Text> : null}
            <Button title="Confirmar revisión" onPress={confirmReview} loading={reviewing} />
            <Button title="Cancelar" onPress={() => { setDecision(null); setReviewError(''); }} disabled={reviewing} />
          </> : <>
            <Button title="Aprobar boleta" onPress={() => setDecision('APPROVED')} />
            <Button title="Rechazar con motivo" onPress={() => setDecision('REJECTED')} />
          </>}
        </View> : null}
      </> : null}
    </ScrollView>
    <Modal visible={expanded} onRequestClose={() => setExpanded(false)}>
      <View style={{ flex: 1, backgroundColor: '#111827', padding: 20, gap: 16 }}>
        <Button title="Cerrar imagen" onPress={() => setExpanded(false)} />
        {image ? <Image source={{ uri: image }} style={{ flex: 1, width: '100%' }} resizeMode="contain" /> : null}
      </View>
    </Modal>
  </AppContainer>;
}
