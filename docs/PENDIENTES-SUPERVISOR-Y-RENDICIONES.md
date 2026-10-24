# Próxima sesión: supervisor que también rinde gastos

Actualización: se implementaron las vistas personales/de empresa, los filtros, el listado de equipo y la política de aprobación según administradores activos. Ver [Rendiciones del supervisor](RENDICIONES-DEL-SUPERVISOR.md). El contenido siguiente conserva la solicitud original y las alternativas discutidas.

Solicitud guardada el 22 de octubre de 2026. Este documento conserva lo conversado; no cambia el comportamiento actual de la aplicación.

## Necesidad

El supervisor o administrador también genera gastos y debe poder registrar y consultar sus propias boletas como cualquier trabajador, además de revisar las de su empresa.

## Aprobación de gastos propios

- Definir una configuración por empresa que indique si existe un único responsable de aprobar rendiciones.
- Si hay varios responsables, definir quién revisa las boletas del supervisor para evitar que apruebe sus propios gastos.
- Si existe un único responsable, permitirle rendir sus gastos. El usuario propuso aprobación automática o una confirmación explícita de que revisó los datos; su última preferencia fue confirmar antes de dejar aprobado.
- Antes de implementar, concretar quién puede cambiar esta configuración y cómo se aplica cuando se agrega un segundo supervisor.
- Guardar auditoría de la configuración y de cada aprobación: responsable, fecha y modalidad (revisión por otra persona o confirmación propia autorizada).
- Aplicar las reglas en el backend, también a la aprobación por lotes; no basta con ocultar botones.

## Trabajadores y revisión

- Sección con el listado de trabajadores de la empresa.
- Al seleccionar una persona, mostrar sus boletas y estados para revisar, aprobar o rechazar.
- Incluir al supervisor como titular de sus propias rendiciones, conservando su rol administrativo.
- En el listado general de boletas, permitir filtrar por trabajador y buscar por código o número de boleta, combinando estos criterios con el estado.

## Reportes y alcance

- Dar al supervisor dos vistas explícitas: **Mis boletas** y **Toda la empresa**.
- La vista personal muestra exclusivamente sus gastos.
- La vista empresarial incluye a todos los trabajadores y al propio supervisor, sin duplicar registros.
- Mantener como base financiera la fecha de la boleta; conservar por separado la fecha de registro.
- Mantener aislamiento entre empresas en todas las consultas, filtros, imágenes y reportes.

## Orden sugerido para retomar

1. Revisar los roles, responsables activos y la configuración actual de aprobación.
2. Concretar e implementar la política de aprobación de gastos propios con auditoría y pruebas de permisos.
3. Agregar filtro por trabajador y acceso desde el listado de personas.
4. Agregar los alcances personal/empresa a listados y reportes, con pruebas de totales y aislamiento.

## Estado al guardar

Rama de trabajo: `feature/admin-corrections-audit`. Hay cambios locales acumulados sin commit ni push, pendientes de revisión del usuario. Ya existen gestión de trabajadores, corrección administrativa de fecha/monto con motivo y un historial de boletas. El inicio de sesión con Google también queda para una etapa posterior.

No se solicitó crear un recordatorio ni iniciar trabajo automático mañana. Retomar estas ideas cuando el usuario continúe la conversación.
