# Reglas de negocio

Describe lo que hace la app. Las reglas tributarias deben validarse con la contadora antes de usarlas como definitivas.

## IVA

Montos en pesos enteros. **Total sin IVA = Total − IVA** siempre; en documentos con montos exentos o impuesto específico los incluye.

| Opción | Cuándo | Cálculo |
|---|---|---|
| 19% incluido | Boleta o factura afecta | Neto = total ÷ 1,19 redondeado; IVA = el resto |
| El que muestra la boleta | Combustible, exentos u otros impuestos | Se copia. Nunca puede superar 19/119 del total (+$1 de redondeo) |
| Exenta | Documento exento | IVA = 0 |
| No lo indica | No se puede saber | IVA = 0, y el Excel avisa que debe revisarse |

- Cada tipo de gasto propone una opción: **combustible** propone «No lo indica», porque su total incluye impuesto específico y el
  19% calculado sería falso. Los demás proponen «19% incluido».
- Las boletas anteriores a la versión 1.2 conservan sus montos. Las de combustible antiguas tienen el IVA calculado al 19%: conviene
  revisarlas con la contadora y corregirlas desde su historial si corresponde.
- Una corrección administrativa conserva la opción de IVA, salvo que se cambie. Si el IVA era impreso y cambia el total, hay que indicarlo de nuevo.

## Duplicados

Una boleta vigente (pendiente o aprobada) impide registrar otra con el mismo tipo de documento y número **del mismo comercio**.

- Los números se comparan sin espacios, puntos, guiones ni ceros a la izquierda.
- Si una de las dos no tiene comercio, basta que coincida la fecha o el total.
- Dos comercios distintos pueden tener el mismo número. Boleta y factura se numeran por separado.
- La misma foto no puede respaldar dos boletas vigentes.
- Una rechazada o retirada se puede volver a presentar.
- La comprobación y el registro ocurren juntos en la base: envíos simultáneos no la burlan.
- A quien revisa se le avisa si hay boletas parecidas (mismo número, o misma persona, fecha y total).

## Comercios

Se identifican por RUT (con dígito verificador) y, si no hay, por nombre. Se crean solos al registrar y se sugieren a toda la empresa.

## Lectura de boletas

1. Se busca el **timbre electrónico del SII** (código de barras): trae RUT, tipo, folio, fecha y total exactos, y manda sobre el texto.
2. Se lee el texto. Cada campo queda como *Del timbre SII*, *Leído*, *Revisar* o *Completar*.
3. El total se acepta si es único o si la aritmética de la propia boleta lo confirma (neto + IVA, o IVA de 19%). Ante duda queda vacío.
4. Nunca se toman subtotales, propinas, efectivo entregado, vuelto ni pagos con tarjeta como total.
5. La persona siempre confirma. Desde $1.000.000 se pide una confirmación adicional.

La lectura ocurre en el equipo: en Android con ML Kit y en la web con librerías servidas por el mismo sitio. La foto solo se envía al guardar.

## Plazos

Se rinden boletas del año en curso, y del anterior hasta el 15 de marzo inclusive. No se aceptan fechas futuras.

## Revisión

- Cada trabajador ve y edita solo sus boletas pendientes. Los administradores revisan, pero no cambian lo que otro rindió.
- Se puede aprobar o rechazar hasta 100 a la vez; rechazar exige un motivo. Todo queda en el historial.
- Con un solo administrador activo, sus boletas se aprueban al guardarse. Con dos o más, otro debe revisarlas.

## Presupuestos

Mensuales y opcionales, de la empresa o de una persona. Se comparan con pendientes y aprobadas; en la vista anual, con los meses transcurridos.

## Comparaciones

Un mes o año en curso se compara con el **mismo tramo** del período anterior, no con el período completo.

## Accesos

- Roles: trabajador y supervisor/administrador.
- Si un correo está en varias empresas, se elige a cuál entrar.
- En Android la sesión se guarda en el almacén seguro; en la web, solo mientras la pestaña está abierta.
