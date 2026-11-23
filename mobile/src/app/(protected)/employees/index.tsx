import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { API_URL, authorized, jsonBody, requestJson } from '@/api/http';
import RefreshableScrollView from '@/components/common/RefreshableScrollView';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Text from '@/components/ui/Text';
import { Banner, Card, Pill, ScreenHeader, Sheet, styles as kit, useWide } from '@/components/ui/kit';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/theme';
import { formatRut } from '@/utils/receiptText';

interface Employee { Id: number; FirstName: string; LastName: string; Email: string; Phone: string | null; Rut: string | null; IsActive: boolean; Role: string; ReceiptCount: number; PendingCount: number; ApprovedCount: number; RejectedCount: number }

export default function Employees() {
  const wide = useWide();
  const { user, token } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [leaving, setLeaving] = useState<Employee | null>(null);
  const [confirmationRut, setConfirmationRut] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const url = `${API_URL}/users`;

  const closeDialogs = useCallback(() => { setSelected(null); setLeaving(null); setConfirmationRut(''); setReason(''); setError(''); }, []);
  useFocusEffect(useCallback(() => () => { closeDialogs(); setMessage(''); }, [closeDialogs]));
  useFocusEffect(useCallback(() => {
    let active = true;
    if (user?.role === 'ADMIN' && token) {
      setRefreshing(true);
      setError('');
      requestJson(url, { headers: authorized(token) }).then(result => { if (active) setEmployees(result.employees); })
        .catch(failure => { if (active) setError(failure instanceof Error ? failure.message : 'No fue posible cargar el equipo.'); })
        .finally(() => { if (active) setRefreshing(false); });
    }
    return () => { active = false; };
  }, [url, token, user?.role, attempt]));
  if (user?.role !== 'ADMIN') return <Redirect href="/(protected)/(tabs)/profile" />;

  async function send(path: string, body: unknown, method: string) {
    if (!token || busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await requestJson(`${url}/${path}`, jsonBody(token, body, method));
      closeDialogs();
      setMessage(result.message);
      setAttempt(count => count + 1);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'No fue posible guardar.'); }
    finally { setBusy(false); }
  }
  function save() {
    if (!selected) return;
    if (!reason.trim()) { setError('Indica el motivo del cambio.'); return; }
    void send(String(selected.Id), { firstName: selected.FirstName, lastName: selected.LastName, email: selected.Email, phone: selected.Phone ?? '', rut: selected.Rut || undefined, reason }, 'PUT');
  }
  function deactivate() {
    if (!leaving) return;
    if (!reason.trim() || !confirmationRut.trim()) { setError('Confirma el RUT e indica el motivo de la baja.'); return; }
    void send(`${leaving.Id}/deactivate`, { rut: confirmationRut, reason }, 'POST');
  }
  const start = (employee: Employee, action: 'edit' | 'leave') => { closeDialogs(); setMessage(''); if (action === 'edit') setSelected({ ...employee }); else setLeaving(employee); };

  return <View style={kit.page}>
    <RefreshableScrollView refreshing={refreshing} onRefresh={() => setAttempt(count => count + 1)} contentContainerStyle={kit.content}>
      <ScreenHeader title="Equipo" subtitle="Personas, accesos y sus rendiciones." right={<Button compact icon="person-add-outline" title="Agregar" onPress={() => router.push('/(protected)/employees/create')} />} />
      {message ? <Banner tone="success">{message}</Banner> : null}
      {error && !selected && !leaving ? <Banner tone="danger">{error}</Banner> : null}
      <View style={s.grid}>{employees.map(employee => {
        const self = employee.Id === user.id, admin = employee.Role === 'ADMIN';
        return <Card key={employee.Id} style={[s.person, { flexBasis: wide ? '31%' : '100%' }, !employee.IsActive && { opacity: 0.72 }]}>
          <View style={kit.row}>
            <View style={s.avatar}><Text style={{ color: Colors.primaryText, fontWeight: '800' }}>{employee.FirstName[0]}{employee.LastName[0]}</Text></View>
            <View style={{ flex: 1, gap: 1 }}><Text numberOfLines={1} style={{ fontWeight: '700' }}>{employee.FirstName} {employee.LastName}{self ? ' (yo)' : ''}</Text><Text numberOfLines={1} style={kit.caption}>{employee.Email}</Text></View>
          </View>
          <View style={kit.wrap}>
            <Pill label={admin ? 'Administrador' : 'Trabajador'} tone={admin ? 'primary' : 'neutral'} />
            {!employee.IsActive ? <Pill label="Dado de baja" tone="danger" /> : null}
            {employee.Rut ? <Pill label={formatRut(employee.Rut)} /> : null}
          </View>
          <View style={s.counts}>{([['Pendientes', employee.PendingCount], ['Aprobadas', employee.ApprovedCount], ['Rechazadas', employee.RejectedCount]] as const).map(([label, value]) => <View key={label} style={{ flex: 1 }}><Text style={{ fontSize: 20, fontWeight: '800' }}>{value}</Text><Text style={kit.caption}>{label}</Text></View>)}</View>
          <Button compact variant="secondary" title="Ver sus boletas" onPress={() => router.push({ pathname: '/(protected)/(tabs)/expenses', params: { workerId: String(employee.Id), view: undefined } })} />
          {employee.IsActive && !admin ? <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button compact variant="ghost" title="Editar datos" style={{ flex: 1 }} onPress={() => start(employee, 'edit')} />
            <Button compact variant="ghost" title="Dar de baja" style={{ flex: 1 }} onPress={() => start(employee, 'leave')} />
          </View> : null}
        </Card>;
      })}</View>
    </RefreshableScrollView>

    <Sheet visible={selected !== null} title="Editar datos" onClose={() => { if (!busy) closeDialogs(); }} footer={<Button title="Guardar cambios" loading={busy} onPress={save} />}>
      {selected ? <>
        <Input label="Nombre" value={selected.FirstName} onChangeText={value => setSelected({ ...selected, FirstName: value })} />
        <Input label="Apellido" value={selected.LastName} onChangeText={value => setSelected({ ...selected, LastName: value })} />
        <Input label="RUT" value={selected.Rut ?? ''} onChangeText={value => setSelected({ ...selected, Rut: value })} placeholder="12.345.678-5" />
        <Input label="Correo de acceso" value={selected.Email} onChangeText={value => setSelected({ ...selected, Email: value })} keyboardType="email-address" />
        <Input label="Teléfono" value={selected.Phone ?? ''} onChangeText={value => setSelected({ ...selected, Phone: value })} keyboardType="phone-pad" />
        <Input label="Motivo del cambio (obligatorio)" value={reason} onChangeText={setReason} maxLength={1000} />
        {error ? <Banner tone="danger">{error}</Banner> : null}
      </> : null}
    </Sheet>
    <Sheet visible={leaving !== null} title="Dar de baja" onClose={() => { if (!busy) closeDialogs(); }} footer={<Button title="Dar de baja y bloquear acceso" variant="danger" loading={busy} onPress={deactivate} />}>
      {leaving ? <>
        <Text style={{ fontWeight: '700' }}>{leaving.FirstName} {leaving.LastName}</Text>
        <Text style={kit.subtitle}>Pierde el acceso de inmediato, incluso con la sesión abierta. Sus boletas, fotos e historial se conservan.</Text>
        <Input label="Escribe su RUT para confirmar" value={confirmationRut} onChangeText={setConfirmationRut} placeholder="12.345.678-5" />
        <Input label="Motivo de la baja (obligatorio)" value={reason} onChangeText={setReason} maxLength={1000} />
        {error ? <Banner tone="danger">{error}</Banner> : null}
      </> : null}
    </Sheet>
  </View>;
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  person: { flexGrow: 1, maxWidth: 560 },
  avatar: { width: 46, height: 46, borderRadius: 16, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  counts: { flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12 },
});
