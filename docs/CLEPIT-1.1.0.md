# Clepit 1.1.0: aplicación principal

Promoción autorizada por el propietario de las mejoras aprobadas hasta Clepit Pruebas 0.1.5. Nombre de la instalación: **Clepit**. Identificador Android original `cl.rg.climatizacion`, esquema `climatizacion-rg`, versión 1.1.0 y código 12. La firma debe coincidir con la aplicación principal anterior; no se desinstala para actualizarla.

Se incluyen escaneo local con revisión y guardado directo, registro manual, Estacionamiento, formularios uniformes, sesión segura persistente mientras sea válida, notificaciones agrupadas, acceso con Google para usuarios registrados y mensajes en español. Se retiran los rótulos experimentales del producto. Los datos de empresa, usuarios y boletas existentes no se migran ni se reemplazan: se continúa usando el backend actual y sus controles de acceso.

## Entrega e integración

1. Conservar `preview/clepit-1.0.10` y `preview/clepit-pruebas-0.1.4` como puntos de recuperación. El código aprobado 0.1.5 está en su rama de funcionalidad.
2. Preparar `release/clepit-1.1.0`, ejecutar pruebas y compilar/verificar nombre, paquete, versión, firma y configuración de Firebase de la APK.
3. Integrar por pull request a `develop` y después a `main`, sin reescribir el historial ni publicar credenciales. Etiquetar la entrega `v1.1.0`.
4. Distribuir `clepit-1.1.0.apk` como actualización de Clepit. Clepit Pruebas sigue siendo una instalación independiente; su sesión local no se copia entre paquetes.
5. Comprobar en el teléfono: actualización sin desinstalar, inicio con contraseña o Google, restauración de sesión, permisos y entrega push, escaneo y guardado con foto, y aviso de boleta duplicada.

## Infraestructura y configuración

Esta entrega de la aplicación y del código de `main` no equivale a contratar alojamiento ni migrar a una infraestructura permanente. El backend de Node, SQL Server y los túneles siguen ejecutándose en el notebook y requieren que esté encendido y conectado. La dirección pública existente continúa siendo la entrada de la API.

El backend conserva las variables privadas de Google, SMTP, SQL Server y Firebase. `GOOGLE_LOGIN_APP_REDIRECTS` debe conservar `climatizacion-rg://google-login`; el callback público de Google ya está registrado. Firebase Android debe incluir `cl.rg.climatizacion`. La credencial privada FCM permanece solo en el backend, excluida de Git y de la APK. No se activa facturación ni se cambia el plan Spark.

Las migraciones existentes deben estar aplicadas al usar otra base de datos. El catálogo de Estacionamiento corresponde a la migración 020, ya aplicada en el entorno actual. Git respalda código, no sustituye el respaldo de SQL Server o de las imágenes de Drive.
