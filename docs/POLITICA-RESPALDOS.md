# Carpeta de respaldo y conservación

## Decisión de producto

- Cada empresa tiene una carpeta raíz de Drive asignada mediante configuración técnica inicial.
- Trabajadores, supervisores y administradores de empresa no cambian esa carpeta desde la aplicación.
- La ruta PUT /storage/google-drive rechaza modificaciones. El callback OAuth ignora carpetas enviadas por el navegador y solo renueva la credencial del almacenamiento existente.
- Renovar la autorización no reasigna la carpeta, no mueve fotos y no elimina respaldos.
- Se mantiene la organización por año y mes de la fecha de la boleta.
- Cualquier excepción futura debe ser una operación técnica controlada con motivo, aprobador, actor, fecha, identificador anterior/nuevo y plan de conservación de archivos históricos. No se implementa un botón de excepción en este avance.

## Verificación de la instalación actual

Se comprobó mediante consulta de lectura que la empresa 1 mantiene almacenamiento activo, carpeta asignada y registro de credencial. Esto no demuestra que Google acepte la credencial ni permite identificar por sí solo su causa de expiración. El error observado es invalid_grant / token expirado o revocado.

## Requisito de conservación pendiente

El usuario solicita conservar boletas y fotografías durante al menos cinco años. Bloquear cambios de carpeta en esta aplicación no impide que un propietario elimine archivos directamente en Google Drive, ni constituye un respaldo independiente o una política de retención inmutable.

Antes de considerar cumplido ese requisito hay que implementar permisos del almacenamiento, copias independientes, conservación de versiones e historial, política de eliminación y pruebas de restauración. También revisar el borrado de imágenes reemplazadas en boletas pendientes, que el código existente aún contempla. Este avance no certifica conservación durante cinco años ni altera la cuenta o configuración de Google Cloud.

## Operación OAuth

Si la aplicación de Google es externa y su estado de publicación es Testing, Google documenta expiración de refresh tokens a los siete días para permisos como Drive. El estado del proyecto Cloud no fue inspeccionado. Referencia: https://developers.google.com/identity/protocols/oauth2#expiration
