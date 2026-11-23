import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { deleteExpenseApi, ExpenseDetail, getExpenseApi, getExpenseImageApi, reviewExpensesApi, VatSource } from '@/api/expense.api';
import ExpenseHistory from '@/components/common/ExpenseHistory';
import ExpenseStatus from '@/components/common/ExpenseStatus';
import PhotoViewer from '@/components/common/PhotoViewer';
import RefreshableScrollView from '@/components/common/RefreshableScrollView';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Text from '@/components/ui/Text';
import { Banner, Card, IconTile, ScreenHeader, SectionTitle, Sheet, styles as kit, useWide } from '@/components/ui/kit';
import { typeIcon, typeName } from '@/constants/expenseTypes';
import { useAuth } from '@/hooks/useAuth';
import { BorderRadius, Colors } from '@/theme';
import { formatCurrency, HIGH_AMOUNT } from '@/utils/currency';
import { dateTime, readableDate } from '@/utils/dates';
import { formatRut } from '@/utils/receiptText';
import { notifyDataRefresh } from '@/utils/refreshEvents';

export const vatLabels: Record<VatSource, string> = { CALCULATED: 'Calculado, 19% incluido', RECEIPT: 'El que muestra el documento', EXEMPT: 'Documento exento', NOT_STATED: 'No informado' };

function Row({ label, value }: { label: string; value: string }) {
  return <View style={s.row}><Text style={s.label}>{label}</Text><Text selectable style={s.value}>{value}</Text></View>;
}

export default function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user } = useAuth();
  const wide = useWide();
  const [expense, setExpense] = useState<ExpenseDetail | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageError, setImageError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [dialog, setDialog] = useState<'APPROVED' | 'REJECTED' | 'DELETE' | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true); setError(''); setImage(null); setImageError(''); setExpense(null);
    if (!token || !/^\d+$/.test(id ?? '')) { setError('Boleta no disponible.'); setLoading(false); return; }
    getExpenseApi(token, Number(id)).then(async data => {
      if (!active) return;
      setExpense(data);
      setLoading(false);
      if (!data.file) return;
      setImageLoading(true);
      try { const uri = await getExpenseImageApi(token, Number(id)); if (active) setImage(uri); }
      catch (failure) { if (active) setImageError(failure instanceof Error ? failure.message : 'No fue posible cargar la foto.'); }
      finally { if (active) setImageLoading(false); }
    }).catch(failure => { if (active) { setError(failure instanceof Error ? failure.message : 'Boleta no disponible.'); setLoading(false); } });
    return () => { active = false; };
  }, [id, token, attempt]));

  const reload = () => setAttempt(value => value + 1);
  const close = () => { if (!busy) { setDialog(null); setActionError(''); } };
  async function confirm() {
    if (!token || !dialog || busy) return;
    if (dialog === 'REJECTED' && !reason.trim()) { setActionError('Indica por qué se rechaza la boleta.'); return; }
    setBusy(true);
    setActionError('');
    try {
      if (dialog === 'DELETE') await deleteExpenseApi(token, Number(id));
      else await reviewExpensesApi(token, [Number(id)], dialog, reason);
      setDialog(null);
      notifyDataRefresh();
      if (dialog === 'DELETE') router.replace('/(protected)/(tabs)/expenses');
      else reload();
    } catch (failure) { setActionError(failure instanceof Error ? failure.message : 'No fue posible completar la acción.'); }
    finally { setBusy(false); }
  }

  const admin = user?.role === 'ADMIN';
  const mine = expense?.UserId === user?.id;
  const pending = expense?.Status === 'PENDING';
  const canReview = Boolean(admin && pending && expense?.CanReview && !expense.DriveSyncPending);

  return <View style={kit.page}>
    <RefreshableScrollView refreshing={loading} onRefresh={reload} contentContainerStyle={[kit.content, { maxWidth: 1080 }]}>
      <ScreenHeader back title={expense ? expense.SupplierName ?? typeName(expense.ExpenseTypeName) : 'Boleta'} subtitle={expense ? `${expense.DocumentType === 'FACTURA' ? 'Factura' : 'Boleta'} ${expense.ReceiptNumber} · ${readableDate(expense.ExpenseDate)}` : undefined} />
      {loading ? <ActivityIndicator color={Colors.primary} style={{ padding: 40 }} /> : error ? <Banner tone="danger" action={<Button compact variant="secondary" title="Reintentar" onPress={reload} style={{ alignSelf: 'flex-start' }} />}>{error}</Banner> : expense ? <View style={{ flexDirection: wide ? 'row' : 'column', gap: 18, alignItems: wide ? 'flex-start' : 'stretch' }}>
        <View style={{ flex: wide ? 1.2 : undefined, gap: 18 }}>
          {expense.Status === 'REJECTED' ? <Banner tone="danger" title="Boleta rechazada">{expense.RejectionReason ?? 'Sin motivo registrado.'}</Banner> : null}
          {expense.DriveSyncPending && pending ? <Banner tone="warning">La foto todavía se está respaldando. Si no cambia en unos minutos, pide al administrador que reintente la sincronización.</Banner> : null}
          {canReview && Number(expense.TotalAmount) >= HIGH_AMOUNT ? <Banner tone="warning" title="Monto alto">Compara el total con la foto antes de aprobar: un dígito de más cambia el reporte.</Banner> : null}
          {canReview && expense.SimilarCount ? <Banner tone="warning" title="Compárala antes de aprobar">{`Hay ${expense.SimilarCount} ${expense.SimilarCount === 1 ? 'boleta parecida' : 'boletas parecidas'} en tu empresa, con el mismo número o con la misma persona, fecha y total.`}</Banner> : null}
          <Card>
            <View style={kit.between}>
              <View style={[kit.row, { flex: 1 }]}><IconTile icon={typeIcon(expense.ExpenseTypeName)} /><Text style={{ fontWeight: '700', flex: 1 }}>{typeName(expense.ExpenseTypeName)}</Text></View>
              <ExpenseStatus status={expense.Status} />
            </View>
            <Text style={s.total}>{formatCurrency(expense.TotalAmount)}</Text>
            <View style={s.breakdown}>
              <View style={{ flex: 1, minWidth: 110 }}><Text style={kit.caption}>Total sin IVA</Text><Text style={{ fontWeight: '700' }}>{formatCurrency(expense.NetAmount)}</Text></View>
              <View style={{ flex: 1, minWidth: 110 }}><Text style={kit.caption}>IVA · {vatLabels[expense.VatSource]}</Text><Text style={{ fontWeight: '700' }}>{formatCurrency(expense.VatAmount)}</Text></View>
            </View>
            <View>
              <Row label="Comercio" value={expense.SupplierName ?? 'Sin registrar'} />
              {expense.SupplierRut ? <Row label="RUT" value={formatRut(expense.SupplierRut)} /> : null}
              {admin ? <Row label="Rendida por" value={mine ? `${expense.UserName} (yo)` : expense.UserName} /> : null}
              <Row label="Descripción" value={expense.Description || 'Sin descripción'} />
              <Row label="Registrada" value={dateTime(expense.CreatedAt)} />
              {expense.ReviewedAt ? <Row label="Revisada" value={`${dateTime(expense.ReviewedAt)}${expense.ReviewedByName ? ` por ${expense.ReviewedByName}` : ''}`} /> : null}
              <Row label="N.º de registro" value={String(expense.Id)} />
            </View>
          </Card>

          {canReview ? <Card>
            <SectionTitle title="Revisión" caption={mine ? 'Eres el único administrador: puedes confirmar tu propia boleta.' : 'Compara los datos con la foto antes de decidir.'} />
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
              {!mine ? <Button title="Rechazar" icon="close" variant="danger" style={{ flex: 1 }} onPress={() => { setReason(''); setDialog('REJECTED'); }} /> : null}
              <Button title="Aprobar" icon="checkmark" variant="success" style={{ flex: 1 }} onPress={() => setDialog('APPROVED')} />
            </View>
          </Card> : admin && mine && pending && !expense.CanReview ? <Banner tone="info">Otro administrador debe revisar esta boleta, porque es tuya.</Banner> : null}

          {mine && pending && !expense.DriveSyncPending ? <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            <Button title="Editar" icon="create-outline" variant="secondary" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/(protected)/expenses/create', params: { editId: expense.Id } })} />
            <Button title="Retirar" icon="trash-outline" variant="ghost" style={{ flex: 1 }} onPress={() => setDialog('DELETE')} />
          </View> : null}
          {mine && expense.Status === 'REJECTED' ? <Button title="Registrar de nuevo" icon="refresh-outline" variant="secondary" onPress={() => router.push('/(protected)/expenses/create')} /> : null}
        </View>

        <View style={{ flex: wide ? 1 : undefined, gap: 18 }}>
          <Card>
            <SectionTitle title="Foto de respaldo" />
            {imageLoading ? <ActivityIndicator color={Colors.primary} style={{ padding: 50 }} /> : image ? <Pressable accessibilityRole="button" accessibilityLabel="Ampliar fotografía" onPress={() => setExpanded(true)}>
              <Image source={{ uri: image }} style={s.photo} resizeMode="contain" onError={() => setImageError('No fue posible mostrar este formato de imagen.')} />
              <Text style={[kit.caption, { textAlign: 'center', marginTop: 8, color: Colors.primaryText }]}>Toca la foto para ampliarla</Text>
            </Pressable> : !expense.file ? <Text style={kit.subtitle}>Este registro no tiene una foto asociada.</Text> : null}
            {imageError ? <Banner tone="warning" action={<Button compact variant="secondary" title="Reintentar" onPress={reload} style={{ alignSelf: 'flex-start' }} />}>{imageError}</Banner> : null}
          </Card>
          {token ? <ExpenseHistory key={`${expense.Id}-${attempt}`} expense={expense} token={token} admin={admin} onChanged={reload} /> : null}
        </View>
      </View> : null}
    </RefreshableScrollView>

    <Sheet visible={dialog !== null} title={dialog === 'APPROVED' ? 'Aprobar boleta' : dialog === 'REJECTED' ? 'Rechazar boleta' : 'Retirar boleta'} onClose={close}
      footer={<View style={{ flexDirection: 'row', gap: 10 }}><Button title="Cancelar" variant="secondary" style={{ flex: 1 }} disabled={busy} onPress={close} /><Button title={dialog === 'APPROVED' ? 'Aprobar' : dialog === 'REJECTED' ? 'Rechazar' : 'Retirar'} variant={dialog === 'APPROVED' ? 'success' : 'danger'} style={{ flex: 1 }} loading={busy} onPress={() => { void confirm(); }} /></View>}>
      <Text style={kit.subtitle}>{dialog === 'DELETE' ? 'Dejará de aparecer en tus boletas. El registro y la foto se conservan en el historial de la empresa.' : 'El trabajador ya no podrá modificarla. Se guardará tu nombre y la fecha.'}</Text>
      {dialog === 'REJECTED' ? <Input label="Motivo (lo verá el trabajador)" value={reason} onChangeText={setReason} multiline maxLength={1000} /> : null}
      {actionError ? <Banner tone="danger">{actionError}</Banner> : null}
    </Sheet>
    <PhotoViewer uri={image} visible={expanded} onClose={() => setExpanded(false)} />
  </View>;
}

const s = StyleSheet.create({
  total: { fontSize: 38, lineHeight: 46, fontWeight: '800', letterSpacing: -1 },
  breakdown: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, padding: 14, borderRadius: BorderRadius.control, backgroundColor: Colors.surfaceMuted },
  row: { flexDirection: 'row', gap: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  label: { width: 108, fontSize: 13, color: Colors.textMuted },
  value: { flex: 1, fontSize: 14, fontWeight: '600' },
  photo: { width: '100%', height: 400, borderRadius: BorderRadius.lg, backgroundColor: '#E9F0F0' },
});
