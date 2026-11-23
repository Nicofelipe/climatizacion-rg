import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { searchSuppliersApi, Supplier } from '@/api/expense.api';
import Input from '@/components/ui/Input';
import Text from '@/components/ui/Text';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/theme';
import { formatRut } from '@/utils/receiptText';
import type { ReactNode } from 'react';

/** Nombre del comercio con sugerencias de los que ya usa la empresa. */
export default function SupplierField({ name, onName, onPick, error, badge }: { name: string; onName: (value: string) => void; onPick: (supplier: Supplier) => void; error?: string; badge?: ReactNode }) {
  const { token } = useAuth();
  const [options, setOptions] = useState<Supplier[]>([]);
  const [typing, setTyping] = useState(false);
  const request = useRef<AbortController | null>(null);

  useEffect(() => {
    const text = name.trim();
    if (!typing || !token || text.length < 2) { setOptions([]); return; }
    const timer = setTimeout(() => {
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      searchSuppliersApi(token, text, controller.signal).then(list => { if (!controller.signal.aborted) setOptions(list.slice(0, 5)); }).catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [name, typing, token]);
  useEffect(() => () => request.current?.abort(), []);

  return <View style={{ gap: 6 }}>
    <Input label="Comercio" icon="storefront-outline" value={name} onChangeText={value => { setTyping(true); onName(value); }} placeholder="Ej: Ferretería El Tornillo" error={error} badge={badge} maxLength={150} autoCapitalize="words" />
    {options.length ? <View style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 14, backgroundColor: Colors.surface, overflow: 'hidden' }}>
      {options.map(item => <Pressable key={item.Id} accessibilityRole="button" accessibilityLabel={`Usar ${item.Name}`} onPress={() => { setTyping(false); setOptions([]); onPick(item); }}
        style={({ pressed }) => ({ paddingHorizontal: 14, paddingVertical: 11, backgroundColor: pressed ? Colors.primarySofter : 'transparent' })}>
        <Text style={{ fontSize: 14, fontWeight: '600' }}>{item.Name}</Text>
        {item.Rut ? <Text style={{ fontSize: 12, color: Colors.textMuted }}>RUT {formatRut(item.Rut)}</Text> : null}
      </Pressable>)}
    </View> : null}
  </View>;
}
