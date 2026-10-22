# Recuperación por correo

Trabajadores y supervisores pueden usar **Olvidé mi contraseña** en el login o **Recuperar contraseña por correo** en Perfil. No necesitan la intervención de otro supervisor. El enlace dura 20 minutos y es de un solo uso. La nueva contraseña y su confirmación usan la misma regla de registro y cambio: mínimo ocho caracteres, mayúscula, minúscula y número. Las diferencias aparecen en un aviso rojo.

## Envío pendiente de configurar

El usuario decidió definir el proveedor después. No se han configurado credenciales SMTP ni enviado correos de prueba. La aplicación muestra claramente que el servicio aún no está configurado, en vez de afirmar que envió un mensaje.

Para habilitarlo, configurar localmente en backend/.env, sin subir secretos a Git:

```
SMTP_HOST=servidor-del-proveedor
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=usuario-del-proveedor
SMTP_PASSWORD=credencial-del-proveedor
SMTP_FROM=Aplicación <correo-remitente@dominio.cl>
PASSWORD_RESET_URL=http://localhost:8081/reset-password
```

Con puerto 465 usar SMTP_SECURE=true. En producción usar una URL HTTPS real para PASSWORD_RESET_URL. SMTP con puerto 587 exige STARTTLS. El proveedor debe autorizar al remitente; configurar SPF/DKIM según sus instrucciones. Nunca utilizar la contraseña ordinaria de una cuenta si el proveedor exige credenciales de aplicación u OAuth.

Aplicar la migración 018: desde backend, `node scripts/apply-password-recovery-migration.cjs`. Reiniciar después de cambiar variables.

## Seguridad y prueba

La respuesta no revela si existe el correo; hay límites de solicitudes por correo e IP. El token aleatorio tiene 256 bits y SQL conserva solo su hash, correo destinatario, versión de contraseña y vencimiento. El enlace se entrega como fragmento, y la pantalla lo quita de la barra después de leerlo.

Al restablecer, se comprueban cuenta, rol y empresa activos, correo aún vigente, versión de contraseña, plazo y uso previo. El cambio, la auditoría y el consumo de todos los enlaces pendientes se guardan en una transacción. Se revocan las sesiones anteriores y se elimina la obligación de cambio inicial. Después se inicia sesión normalmente, sin autenticación automática.

Se intenta enviar una confirmación del cambio sin incluir contraseñas. Un fallo de esa confirmación no revierte la contraseña ni vuelve a habilitar el enlace. Las solicitudes de envío se procesan en segundo plano en el backend actual; para producción con varias instancias o entregas garantizadas se debe incorporar una cola durable y límites compartidos.

Una vez elegido el proveedor, probar con una cuenta propia registrada: solicitar enlace, recibirlo, cambiar contraseña y comprobar que el mismo enlace ya no funciona. Las pruebas automatizadas usan tablas temporales y no envían correos reales.

## Roles al registrar

El alta ahora permite elegir Trabajador (predeterminado) o Supervisor / administrador. Solo un administrador activo de esa misma empresa puede hacerlo y el rol elegido queda auditado. No cambia el rol de cuentas existentes. Al crear el segundo administrador activo, las nuevas rendiciones propias necesitan revisión de otro administrador; no se revierten aprobaciones anteriores.
