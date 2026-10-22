# Administración y correcciones

Desde Perfil, el administrador puede abrir **Gestionar trabajadores** para registrar usuarios y editar nombre, apellido, correo y teléfono. La modificación requiere un motivo y guarda responsable, fecha y datos anteriores y nuevos en AuditLog. No permite cambiar empresa, rol ni contraseña. Los datos nuevos del usuario se reflejan en su siguiente inicio de sesión.

En el detalle de una boleta, **Corregir fecha o monto** está disponible solo para el administrador de la misma empresa, incluso si está aprobada o rechazada. Requiere motivo y conserva el estado de revisión, el propietario y la imagen. La corrección recalcula neto e IVA con la regla actual de la aplicación. La regla especial de combustible requiere definición aparte.

El cambio y su historial se guardan en una transacción SQL. Se comprueban el rol activo y la empresa en SQL y se rechazan formularios cuya fecha o monto ya cambió. Las ediciones normales siguen limitadas a pendientes y también guardan los valores anteriores y nuevos; una reversión por error del respaldo genera un movimiento de reversión.

Al corregir una fecha, se marca la sincronización de Drive como pendiente antes de mover el archivo. Se conserva el mismo archivo, se actualizan nombre y carpeta según la fecha de la boleta y se limpia la marca al terminar. Si falla Drive, los datos y el historial siguen guardados y el detalle muestra **Reintentar sincronización de Drive** al administrador. Mientras esté pendiente no se permite otra edición ni corrección de la boleta. La foto sigue disponible por su ID original.

El trabajador puede ver el historial de sus propias boletas. No puede corregir aprobadas ni rechazadas. Los cambios antiguos que no tenían auditoría no se reconstruyen. Las fechas de los nuevos movimientos se almacenan en UTC y se presentan en la hora local del dispositivo.

## Probar

1. Aplicar la migración aditiva 015 en cada ambiente antes de ejecutar este código. En el entorno local: desde backend, `node scripts/apply-correction-migration.cjs`.
2. Ejecutar `node --test tests/expense-correction-sql.test.cjs tests/expense-permissions.test.cjs`. Solo se modifican tablas temporales.
3. Como administrador, abrir una boleta, corregir monto o fecha con motivo y revisar el historial. Si cambia la fecha, comprobar carpeta y nombre en Drive.
4. Como trabajador, abrir su boleta y comprobar el historial sin opción administrativa. Una ruta de otra empresa debe responder sin entregar datos.

El inicio de sesión con Google queda para una próxima etapa; no se agrega en este cambio.
