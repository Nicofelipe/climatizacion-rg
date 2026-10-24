# Tablero de reportes

En **Reportes** se puede elegir una vista mensual o anual y seleccionar año y mes por separado. Los períodos futuros no están disponibles.

- **Gasto del período:** suma de boletas pendientes y aprobadas. Las rechazadas quedan fuera del gasto.
- **Promedio por boleta:** gasto dividido por la cantidad de boletas pendientes y aprobadas.
- **Evolución:** gráfico diario en la vista mensual y por mes en la anual. Al tocar un punto se muestra su importe. Los días sin gastos aparecen en cero.
- En la vista mensual, **Por día / Entre meses** alterna entre los días del mes y los últimos seis meses hasta el mes seleccionado. La vista anual compara los meses del año. Se destaca el mayor gasto, incluyendo empates. Todos los cálculos usan `ExpenseDate` (fecha de la boleta), no la fecha de creación del registro.
- **Distribución por tipo:** gráfico de anillo con montos y porcentaje de participación. Se puede tocar la leyenda o el segmento.
- **Estados:** cantidades, importes y porcentaje de boletas aprobadas, pendientes y rechazadas. Estos porcentajes se calculan sobre la cantidad total de registros del período.
- **Comparación:** variación respecto al período anterior, cuando hay un importe anterior que permita calcularla.

Los montos se presentan en pesos chilenos. El trabajador ve solamente sus boletas; el administrador ve las de su empresa. El backend aplica el alcance de la sesión.

## Presupuesto pendiente de definición

Actualmente no hay un monto asignado del cual calcular consumo o saldo. Por eso se muestra **Sin presupuesto configurado**. Para implementar ese porcentaje debe definirse si el presupuesto corresponde al trabajador o a la empresa, su periodicidad y quién lo asigna. No se usan valores ficticios.

## Comprobación

Desde `backend`, ejecutar `node --test tests/dashboard.test.cjs tests/period-options.test.cjs` y `npm run typecheck`. Desde `mobile`, ejecutar `npx tsc --noEmit`.

En la aplicación, comprobar mensual/anual, selección de período, interacción de los gráficos y vista angosta de celular. Una empresa sin boletas debe mostrar importes en cero sin divisiones inválidas.
