# Versionado y respaldos de Clepit

## Flujo acordado

1. Cada cambio se trabaja en una rama de funcionalidad o corrección.
2. Se ejecutan las pruebas pertinentes y se entrega una vista previa o APK.
3. Cuando el usuario confirma que el cambio está bien, se hace commit y push a su rama y se verifica el commit remoto.
4. Un respaldo de pruebas puede subirse antes, pero debe identificarse explícitamente como experimental o pendiente de validar.
5. La aprobación de una vista previa no significa autorizar una publicación en productivo. La integración y el despliegue se gestionan por separado.

## Punto de recuperación

`preview/clepit-1.0.10` identifica el código de la vista previa funcional aprobada por el usuario antes del último diseño del Excel y del experimento OCR. Es un respaldo consolidado; no pretende reconstruir commits históricos por cada cambio que no se guardó en su momento. Sigue siendo una versión de pruebas, no una certificación de preparación productiva.

El último formato del Excel se respalda en `feature/excel-layout-logo`. El lector independiente se respalda en `feature/clepit-camera-ocr`. La infraestructura de descarga del experimento tiene su propio commit de soporte.

## Archivos privados

No se suben archivos `.env`, `.secrets`, credenciales de correo/Google/FCM, archivos subidos, APK generadas, dependencias ni configuraciones personales de VS Code. Los ejemplos de configuración contienen únicamente valores de ejemplo. El respaldo Git de código no reemplaza las copias de seguridad de SQL Server ni de las imágenes en Drive.
