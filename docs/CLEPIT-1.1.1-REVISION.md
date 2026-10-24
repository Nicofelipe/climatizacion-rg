# Clepit 1.1.1: revisión de lectura de boletas

La entrega principal anterior quedó cerrada: `main` y etiqueta `v1.1.0`, APK Clepit 1.1.0 y web desplegada en Render desde el commit `8716f65`. El servicio de API y la descarga se restablecieron tras volver a levantar el notebook; la dirección pública de la aplicación se conserva.

Esta mejora se guarda en `fix/receipt-ocr-supermarket`, pendiente de revisión del usuario antes de integrarla a main. La APK conserva nombre Clepit, paquete y firma; cambia a versión 1.1.1, código 13. La APK y etiqueta 1.1.0 siguen disponibles para recuperación.

## Cambios del lector

- Encabezados como `BOLETA. ELECTRONICA 000123456`, NRO., NO y encabezados partidos en varias líneas.
- Fechas numéricas con espacios alrededor de separadores, año al principio, meses escritos en español y año de dos dígitos cuando hay etiqueta Fecha/Emisión.
- Etiqueta TOTALES y adornos como asteriscos, sin tomar conteos de productos o unidades como monto.
- No confundir el final de la palabra TRANSACCION con el indicador N.º de boleta, ni convertir un total negativo en positivo.
- Los valores contradictorios, fechas imposibles, RUT, subtotal o total de IVA siguen requiriendo revisión; no se inventan campos ausentes.

Validación: 164 pruebas completas aprobadas y TypeScript. Casos nuevos basados en textos sintéticos representativos, no en la foto del supermercado mencionada por el usuario. Esa foto aún debe adjuntarse para reproducir su fallo real. Esta mejora interpreta el texto detectado por ML Kit; si la imagen no produce texto legible, no garantiza recuperar sus datos. No se envían imágenes a un OCR externo.

Para probar: instalar 1.1.1, abrir Escanear boleta, elegir la imagen original de la galería, comparar número/fecha/monto/IVA con la imagen y guardar únicamente después de confirmar los datos. La obligatoriedad de la foto, el período de rendición y el aislamiento por empresa no cambian.
