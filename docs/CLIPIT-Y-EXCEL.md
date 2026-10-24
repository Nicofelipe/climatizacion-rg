# Clipit y reporte para contabilidad

La aplicación se llama Clipit. La empresa se muestra con el nombre registrado en la base de datos para la sesión actual; el producto no queda ligado al nombre de una empresa particular.

## Marca

- El logo completo proporcionado por el usuario se conserva en `mobile/assets/images/clipit-original.png` y se muestra en acceso y Perfil.
- `mobile/assets/images/clipit-icon.png` es una adaptación del símbolo para icono de Android, pantalla inicial y favicon. El original completo no se redibujó.
- Inicio mantiene el nombre de la empresa junto a la identidad Clipit.
- APK 1.0.9, nombre de instalación Clipit. Se mantiene el identificador de Android para actualizar la aplicación existente sin desinstalarla y conservar la sesión y configuración de Firebase/OAuth.

## Excel mensual y anual

1. **Resumen:** empresa, período, alcance, cantidades, neto, IVA y total por estado. El total aprobado para revisión contable está destacado y separado del total de todos los estados.
2. **Boletas aprobadas:** solo registros aprobados, ordenados de más reciente a más antiguo. Contiene ID, fecha de la boleta, integrante, código, tipo de gasto, neto, IVA, total CLP y fecha de registro UTC, además de información de respaldo. Incluye filtros y totales al final.
3. **Pendientes y rechazadas:** registros separados del detalle aprobado, identificados por estado y con su propio total.

El reporte usa la fecha de emisión de la boleta; el año es enero a diciembre. El nombre de empresa se consulta con el ID de empresa autenticado, nunca con un parámetro proporcionado por el cliente. Se conserva el alcance personal y empresarial y la autorización exclusiva de administradores para exportar.

Las cifras se guardan como números; el texto de usuarios se guarda como texto literal, sin ejecutarlo como fórmulas. La aprobación interna no sustituye la revisión contable.

Se verificaron separación de estados, totales, límites del período, aislamiento por empresa, tipos de datos y la vista del resumen con datos ficticios. El Excel se actualiza desde el backend y no requiere nueva APK; el cambio de marca sí requiere instalar 1.0.9.
