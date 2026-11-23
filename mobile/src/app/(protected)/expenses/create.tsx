import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import type { VatSource } from '@/api/expense.api';
import FormScrollView from '@/components/common/FormScrollView';
import PhotoViewer from '@/components/common/PhotoViewer';
import ReceiptDateFilter from '@/components/common/ReceiptDateFilter';
import SupplierField from '@/components/common/SupplierField';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Text from '@/components/ui/Text';
import { Banner, Card, Pill, ScreenHeader, SectionTitle, Segmented, styles as kit, useWide } from '@/components/ui/kit';
import { expenseTypes } from '@/constants/expenseTypes';
import { useReceiptForm } from '@/hooks/useReceiptForm';
import { BorderRadius, Colors } from '@/theme';
import { amountDigits, formatCurrency, groupDigits } from '@/utils/currency';
import { forgetCapture } from '@/utils/pendingCapture';
import { todayReceiptDate } from '@/utils/receiptDate';
import type { Confidence, ReadingField } from '@/utils/receiptOcrParser';
import { formatRut, validRut } from '@/utils/receiptText';

const vatOptions: { value: VatSource; title: string; help: string }[] = [
  { value: 'CALCULATED', title: '19% incluido', help: 'La boleta es afecta. El IVA se calcula desde el total.' },
  { value: 'RECEIPT', title: 'El que muestra la boleta', help: 'Combustible, montos exentos u otros impuestos: copia el IVA impreso.' },
  { value: 'EXEMPT', title: 'Exenta', help: 'El documento no lleva IVA.' },
  { value: 'NOT_STATED', title: 'No lo indica', help: 'No se puede saber. Queda en $0 y se avisa en el reporte.' },
];
const badges: Record<Confidence, { label: string; tone: 'success' | 'info' | 'warning' } | null> = {
  exact: { label: 'Del timbre SII', tone: 'success' }, read: { label: 'Leído', tone: 'info' }, review: { label: 'Revisar', tone: 'warning' }, missing: { label: 'Completar', tone: 'warning' },
};

/**
 * En Android se usa el selector de archivos del sistema: funciona en todos los teléfonos. El selector de fotos nuevo
 * no existe en algunos equipos, y si falla, Expo pierde la foto elegida en el reintento.
 */
function openLibrary(options: ImagePicker.ImagePickerOptions) {
  return ImagePicker.launchImageLibraryAsync(Platform.OS === 'android' ? { ...options, legacy: true } : options);
}

export default function ReceiptFormScreen() {
  const params = useLocalSearchParams<{ editId?: string }>();
  const editId = /^\d+$/.test(params.editId ?? '') ? Number(params.editId) : undefined;
  const form = useReceiptForm(editId);
  const { fields, errors, result } = form;
  const wide = useWide();
  const [viewer, setViewer] = useState(false);
  const [pickError, setPickError] = useState('');
  const [manual, setManual] = useState(false);
  const today = todayReceiptDate();
  const firstDate = `${Number(today.slice(0, 4)) - (today.slice(5) <= '03-15' ? 1 : 0)}-01-01`;
  const preview = form.image?.uri ?? form.savedImage?.uri ?? null;
  const showForm = Boolean(wide || editId || form.hasImage || manual || form.recoveredNotice);
  const badge = (field: ReadingField) => {
    const value = !editId && result && form.reading === 'done' ? badges[result.confidence[field]] : null;
    return value ? <Pill label={value.label} tone={value.tone} /> : undefined;
  };

  async function pick(camera: boolean) {
    if (form.saving || form.saved || form.reading === 'working') return;
    setPickError('');
    try {
      // Solo la cámara pide permiso. En la web el selector debe abrirse directamente desde el toque.
      if (camera && Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) { setPickError('Permite usar la cámara para fotografiar la boleta, o elige una imagen.'); return; }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: false, quality: 0.85 };
      if (Platform.OS === 'android') await form.beforePicker(camera);
      const picked = camera ? await ImagePicker.launchCameraAsync(options) : await openLibrary(options);
      if (picked.canceled || !picked.assets?.[0]) return;
      void form.takeImage(picked.assets[0]);
    } catch { setPickError('No fue posible abrir la cámara o las fotos.'); }
    finally { void forgetCapture(); }
  }

  if (form.saved) return <View style={kit.page}><FormScrollView contentContainerStyle={[kit.narrow, { flexGrow: 1, justifyContent: 'center' }]}>
    <Card style={{ alignItems: 'center', paddingVertical: 34, gap: 16 }}>
      <View style={local.done}><Ionicons name="checkmark" size={40} color={Colors.white} /></View>
      <Text accessibilityRole="alert" style={{ fontSize: 24, fontWeight: '800', textAlign: 'center' }}>{editId ? 'Cambios guardados' : 'Boleta guardada'}</Text>
      <Text style={[kit.subtitle, { textAlign: 'center' }]}>
        {form.saved.status === 'APPROVED' ? 'Quedó aprobada y con su foto respaldada.' : 'Quedó pendiente de revisión, con su foto respaldada.'}
      </Text>
      {form.saved.notice ? <Banner tone="warning">{form.saved.notice}</Banner> : null}
      <View style={{ alignSelf: 'stretch', gap: 10 }}>
        {!editId ? <Button title="Registrar otra boleta" icon="add" onPress={() => { setManual(false); form.reset(); }} /> : null}
        <Button title="Ver la boleta" variant="secondary" onPress={() => router.replace({ pathname: '/(protected)/expenses/[id]', params: { id: String(form.saved!.id) } })} />
        <Button title="Ir a mis boletas" variant="ghost" onPress={() => router.replace('/(protected)/(tabs)/expenses')} />
      </View>
    </Card>
  </FormScrollView></View>;

  const photoCard = <Card style={wide ? { width: 360 } : undefined}>
    <SectionTitle title="Foto de la boleta" caption={editId && !form.image ? 'Se conserva la foto guardada si no eliges otra.' : 'Completa, derecha y con buena luz. Incluye el timbre (código de barras).'} />
    {preview ? <Pressable accessibilityRole="button" accessibilityLabel="Ampliar la foto" onPress={() => setViewer(true)} style={local.photo}>
      <Image source={{ uri: preview }} style={{ width: '100%', height: wide ? 420 : 240 }} resizeMode="contain" />
      <View style={local.expand}><Ionicons name="expand-outline" size={16} color={Colors.white} /><Text style={{ color: Colors.white, fontSize: 12, fontWeight: '600' }}>Ampliar</Text></View>
    </Pressable> : form.savedImage?.loading ? <ActivityIndicator color={Colors.primary} style={{ paddingVertical: 40 }} /> : <View style={local.placeholder}><Ionicons name="receipt-outline" size={44} color={Colors.borderStrong} /></View>}
    {form.savedImage?.error && !form.image ? <Banner tone="warning">{form.savedImage.error}</Banner> : null}
    <View style={{ gap: 8 }}>
      <Button title={preview ? 'Tomar otra foto' : 'Tomar foto y leer datos'} icon="camera-outline" variant={preview ? 'secondary' : 'primary'} onPress={() => { void pick(true); }} disabled={form.reading === 'working' || form.saving} />
      <Button title={preview ? 'Elegir otra imagen' : 'Elegir una imagen'} icon="images-outline" variant={preview ? 'ghost' : 'secondary'} onPress={() => { void pick(false); }} disabled={form.reading === 'working' || form.saving} />
      {editId && form.image ? <Button title="Conservar la foto original" variant="ghost" onPress={form.removeImage} disabled={form.saving} /> : null}
    </View>
    {errors.image || pickError ? <Text accessibilityRole="alert" style={local.error}>{pickError || errors.image}</Text> : null}
  </Card>;

  return <View style={kit.page}>
    <FormScrollView contentContainerStyle={[wide ? { ...StyleSheet.flatten(kit.content), maxWidth: 1080 } : kit.narrow]}>
      <ScreenHeader back title={editId ? 'Editar boleta' : 'Registrar boleta'} subtitle={editId ? 'Puedes corregirla mientras esté pendiente.' : 'Toma la foto: Clepit lee los datos y tú los confirmas.'} />
      {form.blocked ? <Banner tone="warning">{form.blocked}</Banner> : form.loading ? <ActivityIndicator color={Colors.primary} /> : <View style={{ flexDirection: wide ? 'row' : 'column', gap: 18, alignItems: wide ? 'flex-start' : 'stretch' }}>
        {photoCard}
        <View style={{ flex: wide ? 1 : undefined, gap: 18 }}>
          {form.recoveredNotice ? <Banner tone="info" title="Elige la foto otra vez">Tu teléfono cerró la app por falta de memoria mientras elegías la foto. Lo que habías escrito sigue aquí.</Banner> : null}
          {form.reading === 'working' ? <Card style={{ alignItems: 'center', paddingVertical: 28 }}><ActivityIndicator color={Colors.primary} size="large" /><Text style={{ fontWeight: '700' }}>Leyendo la boleta…</Text><Text style={kit.caption}>La lectura se hace en tu equipo. Puedes completar los datos mientras tanto.</Text></Card> : null}
          {form.reading === 'failed' ? <Banner tone="warning" title="No pudimos leer la foto">{`${form.readError} Puedes completar los datos a mano.`}</Banner> : null}
          {form.reading === 'done' && result ? result.fromTimbre
            ? <Banner tone="success" icon="shield-checkmark-outline" title="Timbre del SII leído">Número, fecha, total y RUT vienen del código del documento. Confirma el tipo de gasto.</Banner>
            : <Banner tone={result.warnings.length ? 'warning' : 'success'} title={result.warnings.length ? 'Revisa estos datos con la foto' : 'Datos leídos'}>
              <View style={{ gap: 3 }}>{(result.warnings.length ? result.warnings : ['Compáralos con la foto antes de guardar.']).map(text => <Text key={text} style={{ fontSize: 13, lineHeight: 19, color: result.warnings.length ? Colors.warning : Colors.success }}>{text}</Text>)}</View>
            </Banner> : null}
          {!showForm ? <Button title="Prefiero escribir los datos" variant="ghost" icon="create-outline" onPress={() => setManual(true)} /> : <>
            <Card>
              <SectionTitle title="Documento" />
              <Segmented label="Tipo de documento" value={fields.documentType} onChange={documentType => form.update({ documentType })} options={[{ value: 'BOLETA', label: 'Boleta' }, { value: 'FACTURA', label: 'Factura' }]} />
              <View style={[local.columns, !wide && { flexDirection: 'column' }]}>
                <View style={local.column}><Input label={`Número de ${fields.documentType === 'FACTURA' ? 'factura' : 'boleta'}`} icon="pricetag-outline" value={fields.receiptNumber} onChangeText={receiptNumber => form.update({ receiptNumber })} placeholder="Ej: 12345" error={errors.receiptNumber} badge={badge('receiptNumber')} maxLength={50} autoCapitalize="characters" /></View>
                <View style={local.column}><ReceiptDateFilter label="Fecha de la boleta" field value={fields.expenseDate} onChange={expenseDate => form.update({ expenseDate })} clearable={false} minDate={firstDate} maxDate={today} error={errors.expenseDate} badge={badge('expenseDate')} /></View>
              </View>
              <Input label="Total pagado" prefix="$" value={groupDigits(fields.totalAmount)} onChangeText={text => form.update({ totalAmount: amountDigits(text) })} placeholder="0" keyboardType="number-pad" error={errors.totalAmount} badge={badge('totalAmount')} />
            </Card>

            <Card>
              <SectionTitle title="¿En qué se gastó?" />
              <View style={local.types}>{expenseTypes.map(item => {
                const active = fields.typeId === item.id;
                return <Pressable key={item.id} accessibilityRole="radio" aria-checked={active} accessibilityLabel={item.name} onPress={() => form.chooseType(item.id)} style={[local.type, active && { borderColor: Colors.primary, backgroundColor: Colors.primarySoft }]}>
                  <Ionicons name={item.icon} size={22} color={active ? Colors.primary : Colors.textMuted} />
                  <Text style={{ fontSize: 13, fontWeight: active ? '700' : '600', color: active ? Colors.primaryText : Colors.textSecondary }}>{item.name}</Text>
                </Pressable>;
              })}</View>
              {errors.typeId ? <Text accessibilityRole="alert" style={local.error}>{errors.typeId}</Text> : null}
              <View style={[local.columns, !wide && { flexDirection: 'column' }]}>
                <View style={local.column}><SupplierField name={fields.supplierName} onName={supplierName => form.update({ supplierName })} onPick={supplier => form.update({ supplierName: supplier.Name, supplierRut: supplier.Rut ?? fields.supplierRut })} error={errors.supplierName} badge={badge('supplierName')} /></View>
                <View style={local.column}><Input label="RUT del comercio" icon="business-outline" value={validRut(fields.supplierRut) ? formatRut(validRut(fields.supplierRut)!) : fields.supplierRut} onChangeText={supplierRut => form.update({ supplierRut })} placeholder="76.123.456-0" error={errors.supplierRut} badge={result?.supplierRut ? badge('supplierRut') : undefined} maxLength={15} autoCapitalize="characters" hint="Evita duplicados y ayuda a la contadora." /></View>
              </View>
            </Card>

            <Card>
              <SectionTitle title="IVA" caption="El reporte usa exactamente lo que elijas aquí." />
              <View style={{ gap: 8 }}>{vatOptions.map(option => {
                const active = fields.vatSource === option.value;
                return <Pressable key={option.value} accessibilityRole="radio" aria-checked={active} accessibilityLabel={option.title} onPress={() => form.update({ vatSource: option.value })} style={[local.vat, active && { borderColor: Colors.primary, backgroundColor: Colors.primarySofter }]}>
                  <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={21} color={active ? Colors.primary : Colors.textMuted} />
                  <View style={{ flex: 1, gap: 2 }}><Text style={{ fontSize: 14, fontWeight: '700' }}>{option.title}</Text><Text style={kit.caption}>{option.help}</Text></View>
                </Pressable>;
              })}</View>
              {fields.vatSource === 'RECEIPT' ? <Input label="IVA impreso en la boleta" prefix="$" value={groupDigits(fields.vatAmount)} onChangeText={text => form.update({ vatAmount: amountDigits(text) })} keyboardType="number-pad" placeholder="0" error={errors.vatAmount} badge={badge('vatAmount')} /> : null}
              {form.tax && form.tax.net >= 0 ? <View style={local.breakdown}>
                <View style={local.amount}><Text style={kit.caption}>Total sin IVA</Text><Text style={{ fontWeight: '700' }}>{formatCurrency(form.tax.net)}</Text></View>
                <View style={local.amount}><Text style={kit.caption}>IVA</Text><Text style={{ fontWeight: '700' }}>{formatCurrency(form.tax.vat)}</Text></View>
                <View style={local.amount}><Text style={kit.caption}>Total</Text><Text style={{ fontWeight: '800', fontSize: 17, color: Colors.primaryText }}>{formatCurrency(form.tax.total)}</Text></View>
              </View> : null}
            </Card>

            <Card><Input label="Descripción (opcional)" value={fields.description} onChangeText={description => form.update({ description })} placeholder="Obra, cliente o detalle que ayude a revisarla" multiline maxLength={500} /></Card>

            {form.isHigh ? <Banner tone="warning" title={`¿El total es ${formatCurrency(Number(fields.totalAmount))}?`}>
              <Pressable accessibilityRole="checkbox" aria-checked={form.highConfirmed} accessibilityLabel="Confirmo que el total es correcto" onPress={() => form.setHighConfirmed(value => !value)} style={[kit.row, { gap: 8, paddingVertical: 4 }]}>
                <Ionicons name={form.highConfirmed ? 'checkbox' : 'square-outline'} size={22} color={Colors.warning} />
                <Text style={{ flex: 1, fontSize: 14, color: Colors.warning }}>Es un monto alto. Lo comparé con la foto y es correcto.</Text>
              </Pressable>
            </Banner> : null}
            {form.saveError ? <Banner tone="danger" title="No se guardó la boleta">{form.saveError}</Banner> : null}
            <Button title={form.saving ? 'Guardando…' : editId ? 'Guardar cambios' : 'Guardar boleta'} icon="checkmark-circle-outline" loading={form.saving} disabled={form.reading === 'working'} onPress={() => { void form.save(); }} />
          </>}
        </View>
      </View>}
    </FormScrollView>
    <PhotoViewer uri={preview} visible={viewer} onClose={() => setViewer(false)} />
  </View>;
}

const local = StyleSheet.create({
  photo: { borderRadius: BorderRadius.lg, overflow: 'hidden', backgroundColor: '#E9F0F0' },
  placeholder: { height: 150, borderRadius: BorderRadius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.borderStrong, backgroundColor: Colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  expand: { position: 'absolute', right: 10, bottom: 10, flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: 'rgba(11,35,36,0.75)', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20 },
  columns: { flexDirection: 'row', gap: 14 },
  column: { flex: 1, minWidth: 0 },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  type: { flexBasis: '30%', flexGrow: 1, minWidth: 100, alignItems: 'center', gap: 6, paddingVertical: 13, paddingHorizontal: 6, borderRadius: BorderRadius.control, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  vat: { flexDirection: 'row', gap: 11, alignItems: 'center', padding: 12, borderRadius: BorderRadius.control, borderWidth: 1, borderColor: Colors.border },
  breakdown: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, padding: 14, borderRadius: BorderRadius.control, backgroundColor: Colors.surfaceMuted },
  amount: { flex: 1, minWidth: 90, gap: 2 },
  error: { color: Colors.danger, fontSize: 12, lineHeight: 17 },
  done: { width: 76, height: 76, borderRadius: 38, backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center' },
});
