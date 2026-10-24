# Acceso con Google en Clepit Pruebas 0.1.5

Antes de estos cambios se guardó en GitHub la versión aprobada con la etiqueta `preview/clepit-pruebas-0.1.4` (commit `bc2d51f`). La prueba nueva se trabaja en `feature/clepit-trial-google-login`.

## Probar en Android

1. Instalar Clepit Pruebas 0.1.5 sobre la edición de pruebas.
2. Si hay una sesión abierta, cerrar sesión desde Perfil.
3. Pulsar Continuar con Google y elegir el mismo correo que registró el administrador en la empresa. No escribir la contraseña de Clepit en Google.
4. El usuario, la empresa y el rol deben estar activos. Google no crea usuarios nuevos ni asigna privilegios de administrador.
5. Probar primero con Gmail registrado y luego con el correo institucional registrado. Si Google bloquea el acceso antes de volver, anotar el código exacto: `redirect_uri_mismatch`, `admin_policy_enforced`, `org_internal`, etc. No confundir el permiso de administrar Google Cloud con el permiso de iniciar sesión en Clepit.

## Configuración comprobada

- Cliente OAuth existente del proyecto `climatizacion-rg`. Se conservó `http://localhost:3000/api/storage/google-drive/callback` para Drive.
- Se agregó y guardó, con autorización del propietario, `https://climatizacion-rg-pruebas.onrender.com/api/auth/google/callback` como retorno de inicio de sesión.
- El backend configura esa URL en `GOOGLE_LOGIN_REDIRECT_URI` y permite explícitamente `clepit-pruebas://google-login` en `GOOGLE_LOGIN_APP_REDIRECTS` de su `.env` privado.
- La APK usa el esquema independiente de pruebas. Solo solicita `openid email profile`; no solicita acceso al Drive del trabajador.
- Se conservan nonce, intento de cinco minutos, ticket de un solo uso de un minuto y comprobación del verificador. Los correos no registrados, inactivos o ambiguos siguen denegados.
- Un dominio institucional administrado por Google Workspace puede tener políticas propias. Los correos externos a Gmail/Workspace requieren vinculación segura previa; no se omite esa protección solo porque el correo exista en la base de datos.

## Aviso de boleta repetida

La API responde 409 y código `RECEIPT_NUMBER_ALREADY_EXISTS`, con texto en español. En el escáner el aviso aparece junto a Guardar boleta y conserva los datos y la foto. Una boleta repetida no reemplaza la imagen original.

Validación: TypeScript, 16 pruebas focalizadas y compilación Android aprobados. El endpoint público de inicio aceptó el retorno de pruebas, generó el callback HTTPS correcto y rechazó retornos arbitrarios. Google Cloud confirmó que guardó el cliente. El acceso completo con cuentas reales queda pendiente de la prueba del usuario en el teléfono; no se afirma que la cuenta institucional esté ya validada.

Referencias: [Google OAuth para servidores web](https://developers.google.com/identity/protocols/oauth2/web-server), [errores y políticas de identidad](https://developers.google.com/identity/openid-connect/reference).
