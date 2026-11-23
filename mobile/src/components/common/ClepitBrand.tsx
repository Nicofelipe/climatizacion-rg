import { Image, View } from 'react-native';
import Text from '@/components/ui/Text';
import { Colors } from '@/theme';

/** Símbolo, nombre y producto. Es la firma de la app en el acceso y en el menú. */
export default function ClepitBrand({ size = 46, light = false }: { size?: number; light?: boolean }) {
  return <View accessible accessibilityLabel="Clepit Gestión de Boletas" style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.24 }}>
    <View style={light ? { backgroundColor: Colors.white, borderRadius: size * 0.3, padding: size * 0.1 } : null}>
      <Image source={require('../../../assets/images/clepit-mark.png')} style={{ width: size, height: size }} resizeMode="contain" />
    </View>
    <View>
      <Text style={{ fontSize: size * 0.56, lineHeight: size * 0.66, fontWeight: '800', letterSpacing: -0.8, color: light ? Colors.white : Colors.ink }}>Clepit</Text>
      <Text style={{ fontSize: Math.max(11, size * 0.26), lineHeight: Math.max(15, size * 0.34), fontWeight: '600', color: light ? Colors.inkSoft : Colors.primaryText }}>Gestión de boletas</Text>
    </View>
  </View>;
}
