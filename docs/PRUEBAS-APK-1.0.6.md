# Pruebas de APK 1.0.6

Instala la actualización sobre la versión anterior y comprueba en Perfil que diga 1.0.6.

## Cambios

- Fotos: se reemplazó la parte multipart con URI de React Native por un Blob compatible con Expo 57. Corrige `Unsupported form data part implementation`. Se mantiene la validación de contenido y el límite de 10 MB.
- Fechas: se permiten boletas del año actual y, hasta el 15 de marzo inclusive en horario de Chile, del año inmediatamente anterior. Desde el 16 de marzo solo se permite el año actual. No se admiten fechas futuras. Es una regla interna solicitada por la empresa, no una afirmación sobre plazos tributarios. El historial conserva los años anteriores. La restricción se comprueba también en el servidor.
- Excel: al final de Boletas aparecen neto, IVA y total del listado, y otra fila de gasto pendiente más aprobado que excluye rechazadas.
- Contraseña: oculta por defecto, con botón para mostrar u ocultar. Recordar mi correo guarda solo el correo; el gestor de contraseñas del teléfono puede ofrecer autocompletar.
- Botón circular verde + en las pestañas para registrar una boleta; se oculta cuando aparece el teclado.
- Punto rojo en boletas pendientes que todavía no se han abierto con ese usuario en ese dispositivo. Abrir el detalle las marca como vistas.

## Verificaciones realizadas

140 pruebas automatizadas aprobadas y comprobación de tipos de backend y móvil. Se verificó el límite del 15 al 16 de marzo en horario de Chile y el codificador multipart real de Expo. Una foto enviada por ese codificador llegó a la API pública y fue rechazada por usar deliberadamente un año cerrado, sin crear una boleta ni modificar Drive. Los Excel mensual y anual respondieron con archivos XLSX válidos.

## Pruebas pendientes en el teléfono

1. Guardar una boleta real del año permitido con una imagen menor de 10 MB.
2. Abrir su detalle y confirmar que se ve la foto almacenada en Drive.
3. Descargar Excel y revisar las dos filas de totales.
4. Comprobar contraseña oculta, botón de ojo y recordar correo.
5. Probar el botón + y el punto rojo de pendientes sin abrir.

La conexión sigue siendo de pruebas: el backend y SQL Server dependen del computador encendido y de sus túneles. Esta APK no constituye un lanzamiento productivo. Las notificaciones con la aplicación cerrada siguen pendientes de configurar y comprobar en Firebase.
