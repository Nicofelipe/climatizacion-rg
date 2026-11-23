import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/** Plantilla de la web exportada. Se ejecuta solo al compilar. */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es-CL">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="description" content="Clepit Gestión de Boletas: registra, revisa y respalda los gastos de tu empresa." />
        <meta name="theme-color" content="#0B7F7C" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
