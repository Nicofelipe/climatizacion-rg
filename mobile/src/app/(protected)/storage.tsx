import { useEffect, useState } from 'react';
import { Redirect, router } from 'expo-router';
import { Linking, ScrollView, Text } from 'react-native';
import AppContainer from '@/components/layout/AppContainer';
import Button from '@/components/ui/Button';
import { requestJson } from '@/api/http';
import { useAuth } from '@/hooks/useAuth';
import { Colors, Spacing } from '@/theme';
import RefreshableScrollView from '@/components/common/RefreshableScrollView';

export default function StorageScreen() {
  const { user, token } = useAuth();
  const [folderId, setFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt,setAttempt]=useState(0);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [authorizationUrl, setAuthorizationUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!token || user?.role !== 'ADMIN') return;
    let active = true;
    setLoading(true);
    requestJson(`${process.env.EXPO_PUBLIC_API_URL}/storage`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(result => {
      if (active) setFolderId(result.storage?.RootFolderId ?? null);
    }).catch(err => {
      if (active) setMessage(err instanceof Error ? err.message : 'No fue posible consultar la configuración.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, user?.role,attempt]);
  if (user?.role !== 'ADMIN') return <Redirect href="/(protected)/(tabs)" />;

  async function run(action: 'connect' | 'test') {
    if (busy || !token) return;
    setBusy(true);
    setMessage('');
    try {
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const base = `${process.env.EXPO_PUBLIC_API_URL}/storage`;
      if (action === 'connect') {
        const result = await requestJson(`${base}/google-drive/connect`, { headers });
        setAuthorizationUrl(result.authorizationUrl);
        setMessage('Pulsa Autorizar en Google y completa el acceso. Después vuelve aquí y pulsa Comprobar acceso a la carpeta.');
      } else {
        await requestJson(`${base}/google-drive/test`, { headers });
        setMessage('Conexión correcta. Ya puedes volver al formulario y guardar tu boleta.');
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No fue posible completar la conexión.');
    } finally { setBusy(false); }
  }
  return (
    <AppContainer>
      <RefreshableScrollView refreshing={loading||busy} onRefresh={()=>setAttempt(value=>value+1)} contentContainerStyle={{ gap: Spacing.lg }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 26, fontWeight: '700', color: Colors.text }}>Respaldo de boletas en Drive</Text>
        <Text style={{ color: Colors.textSecondary }}>Esta pantalla es solo para administrar el acceso al respaldo de toda la empresa. Los trabajadores no tienen que conectar su cuenta personal.</Text>
        <Text style={{ color: Colors.textSecondary }}>La carpeta de respaldo de tu empresa está fijada por configuración técnica. Renovar el acceso de Google no cambia la carpeta ni mueve tus respaldos.</Text>
        <Text style={{ color: Colors.text, fontWeight: '600' }}>{loading ? 'Consultando carpeta asignada…' : folderId ? 'Carpeta asignada · cambios bloqueados' : 'Sin carpeta asignada. Contacta al responsable técnico.'}</Text>
        {folderId ? <Text selectable style={{ color: Colors.textSecondary }}>Identificador: {folderId}</Text> : null}
        <Text style={{color:Colors.textSecondary,fontSize:13,lineHeight:21}}>Si las fotos se guardan correctamente, no necesitas renovar nada. Primero comprueba la conexión. Solo si el acceso venció, renuévalo e inicia sesión en Google con la cuenta dueña del respaldo.</Text>
        <Button title={busy?'Comprobando…':'Comprobar acceso a la carpeta'} onPress={() => run('test')} disabled={busy || loading || !folderId} />
        <Button title="Renovar permiso de Google" onPress={() => run('connect')} disabled={busy || loading || !folderId} />
        {authorizationUrl ? <Button title="Autorizar en Google" onPress={() => {
          Linking.openURL(authorizationUrl).catch(() => setMessage('No fue posible abrir Google. Inténtalo nuevamente.'));
        }} /> : null}
        {message ? <Text accessibilityRole="alert" style={{ color: Colors.text }}>{message}</Text> : null}
        <Button title="Volver" onPress={() => router.back()} />
      </RefreshableScrollView>
    </AppContainer>
  );
}
