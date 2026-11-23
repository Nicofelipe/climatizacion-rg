import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { API_URL, authorized, jsonBody, requestJson } from '@/api/http';
import RefreshableScrollView from '@/components/common/RefreshableScrollView';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Text from '@/components/ui/Text';
import { Banner, Card, IconTile, ScreenHeader, SectionTitle, Sheet, styles as kit } from '@/components/ui/kit';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/theme';
import { amountDigits, formatCurrency, groupDigits } from '@/utils/currency';
import { notifyDataRefresh } from '@/utils/refreshEvents';

interface Budget { userId: number | null; monthlyAmount: number }
interface Person { Id: number; FirstName: string; LastName: string; IsActive: boolean }
interface Target { userId: number | null; name: string; current: number | null }

export default function Budgets() {
  const { token, user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<Target | null>(null);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const admin = user?.role === 'ADMIN';

  useEffect(() => {
    if (!token || !admin) return;
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([requestJson(`${API_URL}/budgets`, { headers: authorized(token) }), requestJson(`${API_URL}/users`, { headers: authorized(token) })])
      .then(([saved, team]) => { if (active) { setBudgets(saved.budgets); setPeople(team.employees); } })
      .catch(failure => { if (active) setError(failure instanceof Error ? failure.message : 'No fue posible cargar los presupuestos.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, admin, attempt]);
  if (!admin) return <Redirect href="/(protected)/(tabs)" />;

  const of = (userId: number | null) => budgets.find(item => item.userId === userId)?.monthlyAmount ?? null;
  function open(userId: number | null, name: string) {
    const current = of(userId);
    setTarget({ userId, name, current });
    setAmount(current ? String(current) : '');
    setError('');
    setMessage('');
  }
  async function save(value: number | null) {
    if (!token || !target || busy) return;
    if (value !== null && !value) { setError('Escribe un monto mayor que cero.'); return; }
    setBusy(true);
    setError('');
    try {
      const result = await requestJson(`${API_URL}/budgets`, jsonBody(token, { userId: target.userId, amount: value }, 'PUT'));
      setMessage(result.message);
      setTarget(null);
      setAttempt(count => count + 1);
      notifyDataRefresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'No fue posible guardar.'); }
    finally { setBusy(false); }
  }
  const row = (userId: number | null, name: string) => {
    const current = of(userId);
    return <View key={String(userId)} style={[kit.between, { paddingVertical: 8 }]}>
      <View style={[kit.row, { flex: 1 }]}><IconTile icon={userId ? 'person-outline' : 'business-outline'} size={38} /><View style={{ flex: 1 }}><Text style={{ fontWeight: '700' }}>{name}</Text><Text style={kit.caption}>{current ? `${formatCurrency(current)} al mes` : 'Sin presupuesto'}</Text></View></View>
      <Button compact variant="secondary" title={current ? 'Cambiar' : 'Definir'} onPress={() => open(userId, name)} />
    </View>;
  };

  return <View style={kit.page}>
    <RefreshableScrollView refreshing={loading} onRefresh={() => setAttempt(count => count + 1)} contentContainerStyle={kit.narrow}>
      <ScreenHeader back title="Presupuestos" subtitle="Montos mensuales. Se comparan con las boletas pendientes y aprobadas." />
      {message ? <Banner tone="success">{message}</Banner> : null}
      {error && !target ? <Banner tone="danger">{error}</Banner> : null}
      {loading ? <ActivityIndicator color={Colors.primary} /> : <>
        <Card><SectionTitle title="Empresa" caption="Se muestra en la vista «Toda la empresa»." />{row(null, 'Toda la empresa')}</Card>
        <Card><SectionTitle title="Personas" caption="Cada una ve el suyo en su inicio." />{people.filter(item => item.IsActive).map(item => row(item.Id, `${item.FirstName} ${item.LastName}`))}</Card>
      </>}
    </RefreshableScrollView>
    <Sheet visible={target !== null} title={target?.name ?? ''} onClose={() => { if (!busy) setTarget(null); }}
      footer={<View style={{ gap: 10 }}><Button title="Guardar" loading={busy} onPress={() => { void save(Number(amount)); }} />{target?.current ? <Button title="Quitar presupuesto" variant="ghost" disabled={busy} onPress={() => { void save(null); }} /> : null}</View>}>
      <Input label="Monto mensual" prefix="$" value={groupDigits(amount)} onChangeText={text => setAmount(amountDigits(text))} keyboardType="number-pad" placeholder="0" />
      {error ? <Banner tone="danger">{error}</Banner> : null}
    </Sheet>
  </View>;
}
