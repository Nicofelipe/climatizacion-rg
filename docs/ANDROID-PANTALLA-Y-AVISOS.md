# Android: pantalla, teclado y avisos

## Archivo descargado de Firebase

Guardar `google-services.json` exactamente en:

`C:\Dev\climatizacion-rg\mobile\.secrets\google-services.json`

No va en `src`, `backend` ni en una carpeta creada manualmente de Gradle. La configuración de Expo lo incorpora al generar Android. Esta carpeta está excluida de Git. El paquete registrado en Firebase debe ser `cl.rg.climatizacion`.

## Cambios de la APK 1.0.1

- El contenido respeta las zonas de la barra de estado y de los botones de navegación de Android.
- Los formularios usan desplazamiento sensible al teclado: el campo enfocado se mantiene visible y el desplazamiento se restaura al cerrar el teclado. El menú inferior se oculta mientras el teclado está abierto.
- La fecha de la boleta se puede escribir como AAAA-MM-DD o seleccionar en calendario.

Estos cambios requieren instalar la nueva APK: recargar la web no actualiza la aplicación instalada.

## Rendimiento: APK 1.0.2

Al cambiar período o alcance del tablero se cancela la consulta anterior. Al volver a una selección ya consultada se muestra su último resultado mientras se solicita una actualización. La memoria es limitada, se mantiene solo en el componente y se separa por sesión, período, modo y alcance; nunca se reutiliza entre cuentas. Las boletas también cancelan consultas al abandonar la pantalla y conservan el último listado cuando una actualización falla.

Medición de diagnóstico del 22 de octubre de 2026, sin modificar registros: consultas autenticadas al backend local entre 3 y 42 ms; mediante el túnel público, Inicio entre 330 y 457 ms, Equipo 574 ms, Boletas 391 ms. Estas mediciones puntuales no reprodujeron el tiempo de espera reportado en el teléfono y no garantizan una conexión estable.

El backend y SQL Server siguen ejecutándose en el PC, publicados mediante un túnel temporal. Apagar/suspender el PC, perder su conexión o saturarlo puede afectar la aplicación. No es todavía un alojamiento productivo permanente.

## APK 1.0.3: cambio de dirección temporal

El 22 de octubre se confirmó que la dirección `dragon-lake-stomach-valentine.trycloudflare.com` dejó de resolver en DNS. El proceso antiguo reportaba `Unauthorized: Tunnel not found`, mientras el backend local seguía respondiendo. Esto impide conectar antes de validar las credenciales.

Se creó un nuevo túnel a `http://127.0.0.1:3000` y la APK 1.0.3 utiliza `https://postcards-congressional-see-souls.trycloudflare.com/api`. Se comprobaron salud (200 JSON) e inicio de sesión con credenciales ficticias (401 JSON). Los errores DNS de Android se traducen a un mensaje de conexión en español.

El cambio no modifica cuentas, contraseñas ni boletas. El túnel sigue siendo temporal: no usar esta dirección como destino productivo permanente. Las webs compiladas con la dirección anterior también necesitan actualizar su configuración de API y publicarse nuevamente.

## APK 1.0.4: ciclo de registro de avisos corregido

Los registros del túnel mostraron cientos de peticiones repetidas a `/api/notifications/devices/register`. Se confirmó en `expo-notifications` que `getDevicePushTokenAsync` emite `onDevicePushToken`. El manejador anterior de ese evento volvía a obtener el token, disparando el mismo evento indefinidamente.

Se eliminó esa llamada circular. El registro se comprueba al abrir/retomar la aplicación, con una sola operación en marcha y un límite de una comprobación automática por minuto. La sesión nueva reinicia este control. La prueba `push-registration-loop.test.cjs` ejecuta el hook simulando la emisión nativa del evento y veinte avisos de regreso a primer plano: verifica una sola obtención y un solo registro.

Esta corrección se debe verificar antes de atribuir los tiempos de espera al precio del alojamiento. Las limitaciones del túnel temporal son un problema separado.

## Comprobación en el teléfono

1. Actualizar la APK conservando la aplicación instalada.
2. Comprobar que la hora y los iconos del sistema están visibles arriba, sin cubrir el contenido.
3. Comprobar Inicio, Boletas, Reportes y Perfil con navegación de tres botones y, si está disponible, con gestos.
4. En registrar boleta, tocar fecha, monto y observaciones. Repetir en registrar/editar trabajador y cambiar contraseña. Verificar que el teclado no tapa el campo enfocado y que al cerrarlo se recupera la pantalla.
5. Comprobar un campo que ya está visible: no debe desplazarse innecesariamente.

## Estado de los avisos

Hay una bandeja privada dentro de la aplicación y una cola de envío en SQL Server. El registro de dispositivos está ligado a la sesión y a la empresa. Los mensajes del teléfono no contienen montos, nombres ni imágenes de boletas.

El archivo Android por sí solo NO permite enviar notificaciones. Falta configurar una identidad de servidor autorizada para FCM en el proyecto Firebase y probar el envío con un teléfono real. No activar facturación ni compartir una clave privada por el chat.

La clave privada del servidor, cuando se configure, se guarda únicamente en `backend/.secrets/firebase-service-account.json`. Nunca debe copiarse a mobile ni incluirse en una APK. El backend utiliza `FCM_PROJECT_ID` y `FCM_SERVICE_ACCOUNT_FILE`; consultar `backend/.env.example`.

El mismo proyecto Firebase sirve para la aplicación; no hace falta crear uno por empresa. El aislamiento de usuarios y empresas se aplica en el backend.
