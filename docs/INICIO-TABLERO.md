# Inicio: resumen de gastos

Rama de trabajo: `feature/expense-dashboard`. Cambios pendientes de revisión y commit.

## Contenido

- Nombre real de la empresa, saludo y acceso al perfil.
- Identificación del alcance: trabajador (solo sus registros) o administrador (toda su empresa).
- Selectores separados de año y mes, iniciados según la fecha en America/Santiago. El año permite buscar escribiendo cuatro dígitos. Solo se ofrecen años hasta el actual; en el actual, meses hasta el presente. Para años anteriores se ofrecen los doce meses. Al pasar a un año nuevo se habilita automáticamente.
- Alternancia Mensual / Anual. Anual requiere elegir solo el año.
- Total mensual, comparación con el mes anterior, neto e IVA registrados.
- Cantidad y monto de pendientes, aprobadas y rechazadas del mes seleccionado.
- Aviso del total de pendientes de todos los meses, para no ocultar registros antiguos.
- Distribución del gasto por tipo, con montos, cantidades y proporciones.
- Evolución de seis meses en vista mensual; en vista anual, evolución mensual del año seleccionado (hasta el mes actual si es el año en curso).
- Últimas cuatro boletas del período, con estado y enlace al detalle.
- Registro rápido de boleta y navegación inferior con iconos.

## Cálculos y permisos

El total, neto, IVA, categorías y tendencia incluyen pendientes y aprobadas, excluyendo rechazadas. Las tarjetas de estado y el número total de boletas del mes sí muestran todos los estados. No se estima presupuesto ni se inventan límites de gasto.

En Anual se suman todos los meses del año elegido; para el año en curso, solo enero hasta el mes actual. La comparación con el año anterior utiliza el mismo tramo de meses, evitando comparar un año incompleto con uno completo. No se implementó un acumulado de todos los años.

Se usa ExpenseDate para asignar el período. Las últimas boletas se ordenan por fecha descendente e ID descendente. La comparación porcentual solo se muestra si el gasto del mes anterior es mayor que cero; en otro caso se indica que no hubo gasto previo registrado.

GET /api/dashboard obtiene empresa, usuario y rol desde la sesión. Reutiliza la consulta de boletas filtrada del backend; no acepta empresa o trabajador elegidos por el cliente. Responde con Cache-Control: no-store. Los datos se recargan al entrar a Inicio y al cambiar el período; también se puede actualizar manualmente.

Los gráficos usan datos de SQL Server. Se sustituyó el servicio que devolvía datos simulados y se retiró el hook antiguo de demostración.

## Pruebas

- TypeScript de backend y móvil correcto.
- Seis pruebas del resumen: rechazo excluido de totales, estados, categorías, comparación, orden, períodos vacíos, cambio de año, zona horaria y argumentos de alcance de sesión.
- Verificación en navegador con una sesión real de trabajador: empresa y montos reales; selector de septiembre vacío y retorno a octubre; etiquetas y últimas boletas.
- Revisión visual con ancho de 390 y 1200 píxeles, restaurando el tamaño habitual al terminar.
- No se crearon ni modificaron boletas durante la comprobación del tablero.

Se probó además seleccionar directamente 2020 y marzo: el resumen consultó los registros reales de ese período. El saludo utiliza FirstName del usuario autenticado, sin usar el rol como nombre. La cuenta de pruebas actual tiene registrado «Empleado»; cambiar ese dato requiere que el usuario indique el nombre correcto.

## Unificación de Boletas

La pantalla de Boletas usa la misma paleta de Inicio (azul oscuro, verde petróleo, blanco y tonos suaves), tarjetas e iconos por tipo de gasto. Incluye búsqueda por número/tipo, filtros de estado, resumen de cantidad total y estados y acceso al detalle. Se conservan los permisos y el orden por fecha descendente. La paleta compartida también aplica al detalle, edición y botones comunes.

Pruebas adicionales: total anual actual sin meses futuros, comparación con el mismo tramo del año anterior, año histórico completo y habilitación automática de años/meses según hora chilena. TypeScript de backend y móvil pasó. Tras la recarga final quedó pendiente la comprobación visual con una sesión de usuario nuevamente iniciada.
