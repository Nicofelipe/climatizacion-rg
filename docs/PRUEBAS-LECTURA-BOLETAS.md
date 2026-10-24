# Clepit Pruebas: lectura de boletas

Edición Android independiente: **Clepit Pruebas 0.1.2**, paquete `cl.rg.clepit.pruebas`. No reemplaza Clepit 1.0.10. Código aislado en el worktree `C:\Dev\clepit-camera-tests`, rama `feature/clepit-camera-ocr`; se copió la base de trabajo sin archivos de credenciales ni configuración privada.

La revisión 0.1.2 presenta Escanear boleta y Registro manual juntos en Inicio. El botón flotante + y Registrar boleta abren la misma elección. Se unifican alturas, bordes, estados de selección y respuesta al pulsar de los botones; los campos resaltan el foco y los errores. La edición de una boleta existente conserva el acceso directo a su formulario. Validación visual final pendiente en el teléfono.

La revisión 0.1.1 amplía la lectura de frases como «El IVA de esta boleta es», montos separados del símbolo de moneda, espacios de miles y terminaciones `.-`. No utiliza subtotal, vuelto o total de minutos como total financiero. Los valores ambiguos siguen requiriendo corrección manual. Todos los campos del escaneo son obligatorios; IVA cero debe indicarse explícitamente. Se agrega Estacionamiento al catálogo (migración aditiva 020). Pruebas automatizadas y compilación no reemplazan la validación con fotos reales en el teléfono.

## Probar

1. Instalar Clepit Pruebas junto a Clepit actual.
2. Iniciar sesión con correo y contraseña de una cuenta registrada. Google y las notificaciones externas no están configurados para este identificador experimental.
3. En Inicio, pulsar **Registrar con cámara**.
4. Tomar una foto nítida o elegir una imagen de hasta 10 MB.
5. Revisar número de boleta, fecha de emisión, monto total e IVA. Los campos son editables. Si faltan datos o existen varios candidatos, el lector avisa y deja el campo vacío en lugar de adivinar.
6. Seleccionar el tipo de gasto y confirmar que se cotejaron los datos con la foto.
7. Pulsar **Usar estos datos en el formulario**. Se conserva la misma fotografía y todavía se pueden modificar los datos antes de guardar.
8. Solo **Guardar boleta** envía la foto y el registro al backend de la empresa. Esta edición utiliza el mismo backend de pruebas; guardar sí crea una boleta real. La lectura por sí sola no crea registros.

## IVA y reglas

El IVA leído es una referencia revisable y se conserva en la descripción. El IVA final de la boleta sigue calculándose en el servidor según las reglas existentes del tipo de gasto. No se introdujo un reemplazo manual de IVA que permita eludir las reglas de combustible o de la empresa.

La fecha se valida con la política vigente: año actual, o año anterior hasta el 15 de marzo inclusive en Chile; no se aceptan fechas futuras. Los permisos y la aprobación se mantienen en el servidor.

## Tecnología y privacidad

Se utiliza el modelo latino integrado de Google ML Kit (`com.google.mlkit:text-recognition:16.0.1`). La foto se procesa en el dispositivo, sin enviarla a una API externa de OCR. El texto completo reconocido no se guarda en registros del servidor ni se pasa por parámetros de URL. El borrador es temporal en memoria, se consume una vez y se verifica por usuario y empresa.

## Límites y comprobaciones

No se garantiza precisión con imágenes borrosas, letras cortadas, múltiples fechas, tickets de pago o diseños no contemplados. No se deduce el número desde el RUT, la autorización del pago ni el importe más grande. Se probaron etiquetas, separación de RUT, múltiples folios, fechas imposibles, importes en CLP, IVA inválido y aislamiento del borrador. La validación final requiere fotos reales del teléfono; no se crearon boletas ficticias durante la implementación.

El onboarding y el selector de aprobación por lotes no se incluyen en este primer experimento.

## Resultado de compilación

APK generada y firma verificada. Se confirmó el paquete independiente `cl.rg.clepit.pruebas`, nombre Clepit Pruebas y versión 0.1.0, así como la presencia del módulo nativo, el modelo OCR integrado y la pantalla del escáner en el archivo compilado. Seis pruebas de interpretación/aislamiento y la comprobación de tipos del móvil aprobadas. El reconocimiento de fotos reales y el envío deben comprobarse en el teléfono.
