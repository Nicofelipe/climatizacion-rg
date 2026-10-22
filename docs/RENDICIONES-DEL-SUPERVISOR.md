# Rendiciones del supervisor

## Aprobación

La regla se calcula automáticamente con los administradores **activos** de cada empresa y su rol activo en SQL Server. No se agrega una casilla que pueda quedar desactualizada al incorporar otro supervisor.

- Con varios administradores activos, otro debe revisar las boletas del administrador que las rindió. No puede aprobar ni rechazar las propias, tampoco incluyéndolas en un lote. Si el lote incluye una boleta propia prohibida, se rechaza completo.
- Con un único administrador activo, sus nuevas boletas se aprueban automáticamente después de que la imagen obligatoria quede guardada. El historial registra responsable, fecha y motivo como **Aprobación automática · administrador único**.
- Sus boletas pendientes anteriores pueden confirmarse explícitamente mientras siga siendo el único administrador activo. El historial distingue esa confirmación de la aprobación automática.
- Un trabajador conserva el flujo pendiente → revisión por administrador.
- La regla se evalúa al registrar/revisar; no cambia masivamente estados anteriores cuando cambia la cantidad de administradores. Las aprobaciones existentes se conservan.
- Si falla la comprobación automática luego de guardar una boleta, queda pendiente para revisar, sin afirmar que se aprobó ni borrar su respaldo.

La última solicitud del usuario eligió aprobación inmediata para el único administrador; reemplaza la alternativa de confirmación inicial que se había dejado anotada en el documento de pendientes.

## Pantallas

**Inicio** tiene el mismo selector personal/empresa. El título del importe identifica explícitamente **Mi gasto personal** o **Gasto de toda la empresa**; al abrir el listado desde el resumen se mantiene ese alcance.

Los filtros de Boletas están agrupados en un panel. Desde/Hasta abren un calendario con selección independiente de año y mes; no requieren escribir fechas. Equipo usa filas compactas en web y tarjetas reducidas en móvil, con acciones pequeñas.

**Boletas** ofrece al administrador **Toda la empresa / Mis boletas**, selección de integrante, búsqueda por código/tipo/nombre, estado y rango inclusivo de fechas de la boleta (AAAA-MM-DD). Los criterios se combinan. Las tarjetas identifican a su titular y mantienen orden de fecha de boleta descendente. El resumen superior corresponde al integrante/alcance elegido en todos los períodos; la cantidad de resultados corresponde a los filtros aplicados.

**Equipo**, visible solo para administradores, incluye trabajadores y administradores activos, con cantidades por estado. **Ver rendiciones** abre el listado filtrado por esa persona. La edición de datos de trabajadores conserva las restricciones previas y su auditoría.

**Reportes** permite alternar entre gastos personales y empresa. El backend aplica el alcance personal mediante el filtro de propietario; una solicitud de empresa hecha por un trabajador permanece limitada a sus boletas. La vista empresarial incluye a los administradores sin duplicarlos.

## Validación

Desde backend: `npm test` y `npm run typecheck`. Desde mobile: `npx tsc --noEmit`. Las pruebas SQL usan tablas temporales e incluyen revisión propia prohibida con varios administradores, revisión por otro administrador, aprobación del único administrador, imagen obligatoria y aislamiento de empresas. Los reportes prueban el alcance personal del administrador y la imposibilidad de ampliar el alcance de un trabajador.

No requiere una migración nueva: utiliza los campos de revisión y auditoría de las migraciones 014 y 015. No crea administradores adicionales ni cambia permisos de personas.
