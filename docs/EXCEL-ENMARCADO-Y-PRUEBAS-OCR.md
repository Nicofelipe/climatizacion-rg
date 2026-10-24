# Excel delimitado y lector experimental

El Excel se actualizó con el logo transparente de Clepit y una cabecera de texto sin banda que se extienda sobre celdas ajenas al reporte. El Resumen termina en E; los detalles, en M. Los colores se aplican a celdas concretas, no a filas completas. Las áreas de impresión también quedan delimitadas y la cantidad de filas del detalle crece con las boletas. Se mantienen las hojas separadas de aprobadas y pendientes/rechazadas y los totales de neto, IVA y total.

Se verificó el resumen renderizado con datos ficticios, la presencia de la imagen, las celdas fuera del rango sin color de cabecera y los Excel mensual/anual desde la API pública. La aplicación instalada no necesita actualización para obtener este Excel: basta descargarlo nuevamente.

La lectura de boletas se implementó únicamente en el worktree `C:\Dev\clepit-camera-tests`, rama `feature/clepit-camera-ocr`. Esa edición tiene un identificador de Android distinto (`cl.rg.clepit.pruebas`) y no reemplaza Clepit habitual. El flujo pide revisar los datos y elegir el tipo antes de pasar al formulario. Solo Guardar crea el registro en la empresa del usuario. El IVA leído es una referencia en la descripción; el cálculo final sigue en el servidor.

Las instrucciones y límites del experimento están en `C:\Dev\clepit-camera-tests\docs\PRUEBAS-LECTURA-BOLETAS.md`. La comprobación final de reconocimiento y guardado con fotos reales debe hacerse en el teléfono.
