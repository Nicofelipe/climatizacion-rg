# Contraseña inicial y cambio por el titular

Los nuevos trabajadores creados por el administrador reciben una contraseña inicial y MustChangePassword=1. En su primer acceso correcto, por contraseña o Google, el servidor guarda FirstLoginAt en UTC. El vencimiento es exactamente 48 horas después y no se reinicia al volver a ingresar.

La aplicación muestra las horas y minutos restantes. Al vencer, el backend bloquea el acceso a boletas, fotos, reportes y gestión. El usuario aún puede autenticarse en una sesión restringida y cambiar su contraseña: no necesita que alguien desbloquee manualmente su cuenta si conoce la contraseña actual. No se cambia IsActive ni se elimina la cuenta.

En **Perfil → Cambiar contraseña**, cualquier usuario puede introducir su contraseña actual y una nueva de al menos 8 caracteres, con mayúscula, minúscula y número, distinta y de máximo 72 bytes para bcrypt. Se pide confirmación en la interfaz. Tras cambiarla, se quita la obligación y se incrementa PasswordVersion: las sesiones anteriores quedan revocadas. La sesión que hizo el cambio recibe un token nuevo.

Los primeros accesos, cada inicio de sesión y el cambio de contraseña dejan auditoría. No se guardan contraseñas ni hashes en AuditLog. La contraseña solo se conserva como hash bcrypt en AppUser. Cinco verificaciones incorrectas de contraseña actual limitan nuevos intentos por diez minutos en esta instancia del backend.

## Migración

Aplicar 017 antes de iniciar el código: desde backend, `node scripts/apply-password-policy-migration.cjs`. Las cuentas existentes quedan con MustChangePassword=0 para no bloquearlas retroactivamente; pueden cambiar voluntariamente su contraseña desde Perfil. Para exigir el cambio a una cuenta antigua se necesita un procedimiento administrativo explícito, todavía no agregado.

El registro ahora permite seleccionar Trabajador o Supervisor / administrador. La recuperación por correo está implementada y requiere configurar un proveedor antes de enviar mensajes reales; ver [Recuperar contraseña](RECUPERAR-CONTRASENA.md). Los recordatorios de las 48 horas se muestran dentro de la aplicación, sin avisos push.

## Comprobar

Registrar un trabajador nuevo, iniciar sesión y observar el aviso de 48 horas. Salir y volver a entrar debe mantener FirstLoginAt y reducir el plazo. Cambiar la contraseña elimina el aviso y permite el uso normal. Las pruebas de política cubren el límite exacto de vencimiento, el bloqueo de rutas de datos, la posibilidad de cambiar la contraseña vencida y la revocación de sesiones anteriores.
