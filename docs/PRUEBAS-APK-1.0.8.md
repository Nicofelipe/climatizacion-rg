# APK 1.0.8: archivo nativo al subir fotos

Corrige el error de Android `Creating Blobs from ArrayBuffer and ArrayBufferView are not supported`.

La versión anterior leía los bytes de la imagen y construía un Blob global. Ese constructor funciona en Node, pero React Native no admite ese tipo de entrada. Ahora se adjunta directamente `File` de `expo-file-system`: el codificador multipart de Expo obtiene sus bytes sin crear ese Blob. Se conserva el límite de 10 MB antes de leer la imagen.

La prueba de regresión ahora utiliza el parche FormData y el codificador multipart reales de Expo, junto a un constructor Blob que rechaza la conversión como Android. Comprueba el nombre, el tipo PNG, los bytes enviados y que la ruta privada no se envíe. La prueba anterior usaba FormData/Blob de Node y no cubría esta diferencia del teléfono.

Para comprobarlo: actualizar a 1.0.8, verificar la versión en Perfil, crear una boleta con foto y fecha permitida, guardarla y abrir su detalle. Falta confirmar el guardado real en Drive desde el teléfono; la prueba automatizada no crea boletas de la empresa.

Se conservan los cambios de la versión 1.0.7. No se requiere cambiar la configuración de Drive por este error.

## Comprobación desde el teléfono

El usuario confirmó que la foto se subió correctamente y que su boleta quedó aprobada automáticamente por ser el único administrador.

## Notificaciones nuevas

La API ahora devuelve solo notificaciones sin leer. Abrir una la marca como leída y la siguiente actualización la retira de la lista y reduce el contador. El registro se conserva en la base de datos y el historial de la boleta sigue disponible. Cerrar el panel sin abrir una notificación no la marca como leída. Este ajuste se aplica desde el servidor y no necesita otra APK.

Se comprobó con consultas reales sobre tablas SQL temporales el ciclo de leer, volver a listar y reducir el contador, además del aislamiento por usuario y empresa.
