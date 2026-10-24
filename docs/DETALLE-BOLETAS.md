# Listado, detalle e imagen

Rama de trabajo: `feature/receipt-detail`. Cambios locales pendientes de revisión y commit.

## Flujo para probar

1. Entrar como trabajador y abrir Boletas.
2. Cada tarjeta muestra fecha, número, monto y etiqueta: Pendiente (amarillo), Rechazada (rojo) o Aprobada (verde).
3. Pulsar una tarjeta. Debe abrir el detalle con tipo, proveedor, fecha, número, ID, neto, IVA, total, descripción y fecha de creación.
4. La fotografía se obtiene desde el backend con el token del usuario. Pulsarla para ampliarla y usar Cerrar imagen para regresar.
5. En PENDING aparece Editar boleta. Se precargan los datos y puede conservarse la foto existente o elegir otra.
   El formulario carga y muestra la foto guardada. Quitar imagen para reemplazarla solo retira la vista previa del borrador y exige seleccionar otra antes de guardar. Quitar foto seleccionada descarta una selección nueva. Cancelar reemplazo conserva la foto original; no elimina archivos de Drive.
6. Guardar cambios, volver al detalle y comprobar los valores; al regresar al listado, los datos se recargan.
7. En APPROVED y REJECTED no aparece Editar. Abrir manualmente el formulario con editId tampoco habilita el guardado; el backend vuelve a comprobar el estado.
8. Para una rechazada aparece Registrar nuevamente: abre un registro nuevo con fotografía obligatoria. Puede repetirse su número si solo hay registros rechazados; si existe uno pendiente o aprobado con ese número en la empresa, se bloquea el duplicado. El registro rechazado se conserva.

## Seguridad

- GET /api/expenses/:id conserva la consulta por empresa y propietario para empleados.
- GET /api/expenses/:id/image aplica la misma consulta antes de acceder a Drive. No acepta IDs de archivo enviados por el cliente.
- El administrador conserva acceso a las boletas de su empresa.
- Las imágenes se entregan como data URI autenticada con Cache-Control: no-store; no se crean enlaces públicos ni permisos nuevos de Drive.
- Los datos de la foto se mantienen en memoria de la pantalla. No se guardan credenciales en la URL de la imagen.

## Límites y pendientes

- La revisión individual ya puede realizarse desde el detalle por ADMIN, con confirmación y motivo obligatorio para rechazar. Guarda ReviewedAt (UTC), ReviewedByUserId y RejectionReason; registra cada decisión en AuditLog dentro de la misma transacción.
- Los registros históricos no reciben datos de revisión inventados; si no tienen motivo, la pantalla lo indica.
- La API permite revisar hasta 100 pendientes en una operación; la selección múltiple en la interfaz sigue pendiente.
- Falta la relación explícita entre el registro rechazado y su reingreso.
- La edición de pendientes no incorpora todavía un plazo de tiempo.
- HEIC/HEIF pueden no tener vista previa en todos los navegadores; la pantalla informa si el visor no puede mostrarlos.
- Una recarga completa exige volver a iniciar sesión porque la sesión actual se conserva en memoria.

## Verificación realizada

TypeScript de backend y móvil pasó. Pruebas de controlador verifican autenticación, IDs inválidos, uso de empresa/usuario desde sesión, ausencia de acceso a Drive para boletas no visibles y respuesta de imagen sin caché. Se ejecutaron también las regresiones de acceso, guardado, Drive y nombres de archivo. Falta la prueba manual visual con una sesión real tras la recarga de desarrollo.

## Orden y revisión

El listado usa ExpenseDate DESC, Id DESC: fecha de boleta de más reciente a más antigua; para fechas iguales, registro más reciente primero. Modificar una boleta no la sube al inicio si su fecha sigue siendo antigua.

Se aplicó la migración aditiva 014 en SQL Server local para incorporar los tres campos de revisión y su referencia al usuario. No se aprobaron ni rechazaron registros reales. Se probaron aprobación por lote, motivo y auditoría, restricciones de rol/empresa y conflictos con SQL Server mediante tablas temporales aisladas.

La corrección de vista previa en edición se comprobó en el navegador: imagen existente cargada, retirada temporal y cancelación con restauración de la imagen original. No se enviaron cambios ni se borraron archivos durante esa comprobación. TypeScript del móvil pasó.
