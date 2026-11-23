import { Redirect } from 'expo-router';

// Dirección anterior: el registro y el escaneo son ahora una sola pantalla.
export default function ScanReceipt() {
  return <Redirect href="/(protected)/expenses/create" />;
}
