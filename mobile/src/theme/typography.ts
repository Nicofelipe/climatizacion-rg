import { Platform } from 'react-native';

const Typography = { title: 28, heading: 22, subtitle: 18, body: 15, caption: 13, small: 12 };

const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const family = (name: string) => Platform.OS === 'web' ? `${name}, ${SANS}` : name;

// Cada peso es una familia propia: en Android fontWeight no elige el archivo de una fuente personalizada.
const body: Record<string, string> = {
  400: family('PlusJakartaSans_400Regular'), 500: family('PlusJakartaSans_500Medium'), 600: family('PlusJakartaSans_600SemiBold'),
  700: family('PlusJakartaSans_700Bold'), 800: family('PlusJakartaSans_800ExtraBold'),
};
const display = { 700: family('BricolageGrotesque_700Bold'), 800: family('BricolageGrotesque_800ExtraBold') };

/** Títulos y cifras grandes usan la tipografía de marca; el resto, la de lectura. */
export function fontFor(weight: string | number | undefined, size: number) {
  const value = weight === 'bold' ? 700 : weight === 'normal' || weight === undefined ? 400 : Number(weight);
  if (value >= 700 && size >= 20) return value >= 800 ? display[800] : display[700];
  return body[value >= 800 ? 800 : value >= 700 ? 700 : value >= 600 ? 600 : value >= 500 ? 500 : 400];
}

export default Typography;
