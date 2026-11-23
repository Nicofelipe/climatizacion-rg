import { Image, Modal, ScrollView, useWindowDimensions, View } from 'react-native';
import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '@/components/ui/Button';
import { Colors } from '@/theme';

/** Foto a pantalla completa: ajustada o ampliada para comprobar los números pequeños. */
export default function PhotoViewer({ uri, visible, onClose }: { uri: string | null; visible: boolean; onClose: () => void }) {
  const screen = useWindowDimensions();
  const [zoom, setZoom] = useState(false);
  const [ratio, setRatio] = useState(1.4);
  useEffect(() => { if (!visible) setZoom(false); }, [visible]);
  useEffect(() => { if (uri) Image.getSize(uri, (width, height) => { if (width) setRatio(height / width); }, () => {}); }, [uri]);
  const width = Math.max(900, screen.width * 1.8);
  return <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0B2324', padding: 14, gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="Cerrar" icon="close" variant="secondary" compact onPress={onClose} style={{ flex: 1 }} />
        <Button title={zoom ? 'Ver completa' : 'Ampliar'} icon={zoom ? 'contract-outline' : 'expand-outline'} compact onPress={() => setZoom(value => !value)} style={{ flex: 1 }} />
      </View>
      {uri ? zoom
        ? <ScrollView horizontal><ScrollView nestedScrollEnabled><Image source={{ uri }} accessibilityLabel="Foto ampliada de la boleta" style={{ width, height: Math.min(20000, width * ratio) }} resizeMode="contain" /></ScrollView></ScrollView>
        : <Image source={{ uri }} accessibilityLabel="Foto de la boleta" style={{ flex: 1, width: '100%', backgroundColor: Colors.black }} resizeMode="contain" />
        : null}
    </SafeAreaView>
  </Modal>;
}
