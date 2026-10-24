# Clepit 1.1.2 — revisión antes de integrar a main

## Lectura de boletas

Se admiten «Número de boleta», «N° BOLETA», «BOL.», «N.º», variantes del círculo ordinal y etiquetas separadas en varias líneas. Se conservan los ceros iniciales. Un folio explícito tiene prioridad sobre números sueltos; dos folios explícitos distintos requieren corrección manual. No se sustituyen fechas ni RUT por el número de boleta.

Estas pruebas usan texto representativo. Falta comprobar la imagen concreta que reportó el usuario; la calidad y distribución de la foto todavía pueden afectar el reconocimiento.

## Baja del trabajador

1. En **Equipo**, editar al trabajador y registrar su RUT si es una cuenta antigua. Se valida el dígito verificador; el cambio exige motivo y queda auditado.
2. Seleccionar **Dar de baja**. Revisar nombre y correo; escribir el RUT y el motivo obligatorio.
3. Confirmar. El servidor compara el RUT guardado, verifica empresa y administrador activo en la transacción, desactiva la cuenta e incrementa la versión de sesión. También desactiva los dispositivos de notificaciones.
4. Las siguientes solicitudes con una sesión anterior quedan bloqueadas. Ingresar con la contraseña correcta muestra que la cuenta fue dada de baja. Google y recuperación continúan limitados a cuentas activas.
5. El trabajador sigue visible como **Dado de baja · Sin acceso**, con sus rendiciones históricas. No se eliminan cuentas, fotos ni boletas. No se incluye reactivación en esta versión.

La acción se limita a trabajadores; no permite dar de baja administradores ni la propia cuenta. El RUT es una confirmación contra errores, no reemplaza la autenticación del administrador. Una información ya descargada o una notificación entregada al teléfono no puede retirarse remotamente.

Los nuevos formularios piden RUT. La API admite omitirlo al crear para mantener compatibles las APK anteriores; ninguna baja se permite sin un RUT válido previamente registrado.

## Aplicación de la base de datos

Con la configuración local existente del backend:

```powershell
cd C:\Dev\climatizacion-rg\backend
C:\Dev\tools\node24\node.exe C:\Dev\clepit-camera-tests\backend\scripts\apply-employee-rut-migration.cjs
```

La migración 021 es aditiva e idempotente: agrega `AppUser.Rut` nullable. No inventa RUT para cuentas anteriores.

## Distribución

Validación: 173 pruebas aprobadas, comprobación TypeScript del backend y móvil sin errores, compilación Android release completada. Firma verificada contra la de la versión instalada. Las pruebas SQL de baja usan tablas temporales, sin dar de baja trabajadores reales.

APK 1.1.2, código Android 14, paquete `cl.rg.climatizacion`, mismo firmante que Clepit. Instalar como actualización. El código queda en `fix/receipt-ocr-supermarket`, sin fusionar a `main` hasta revisión del usuario.

El backend y SQL Server continúan en el notebook. Las direcciones temporales de los túneles pueden cambiar al detenerse; todavía no hay alojamiento permanente independiente del equipo.
