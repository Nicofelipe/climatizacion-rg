# Publicar y probar en Android

## Estado actual

El envío de recuperación con Gmail ya fue probado por el usuario: llegó el correo. El enlace todavía usa localhost. Falta comprobar el cambio de contraseña completo desde una dirección pública.

La aplicación consta de una interfaz Expo (web y Android), una API Node y SQL Server. La API usa msnodesqlv8, ODBC y autenticación integrada de Windows en dos lugares: src/database/sqlServer.ts y src/services/auth.service.ts dentro de backend. Publicar solamente la interfaz no publica la API ni la base de datos.

## Primera etapa: prueba gratuita en el teléfono

1. Comprobar si existe una cuenta propia en https://expo.dev e iniciar sesión. Si no existe, crear una con el plan Free. No hace falta publicar en una tienda para instalar una APK.
2. Preparar una dirección HTTPS pública para la API y otra para la web. Un túnel de Cloudflare permite una prueba temporal conservando SQL Server en el computador. El computador, SQL Server, la API y los túneles deben permanecer encendidos. La URL temporal cambia al recrear el túnel; no es alojamiento permanente.
3. Configurar EXPO_PUBLIC_API_URL con la dirección pública de la API terminada en /api, antes de exportar la web o compilar Android. Esta variable es pública: nunca poner contraseñas allí.
4. Configurar PASSWORD_RESET_URL en backend/.env con la dirección pública de la web terminada en /reset-password. Reiniciar la API y solicitar un correo nuevo. Los enlaces enviados anteriormente conservan su dirección antigua.
5. Actualizar los callbacks y direcciones permitidas de Google para esas direcciones públicas. Conservar separadas las configuraciones de Drive y del inicio de sesión. No borrar callbacks existentes durante la prueba.
6. Vincular el proyecto con la cuenta Expo y preparar un perfil EAS preview con distribution internal y android.buildType apk. La API pública debe estar definida antes de compilar: instalar una APK no convierte localhost en una dirección accesible.
7. Generar con `npx eas-cli@latest build --platform android --profile preview`, desde mobile, una vez preparado el perfil. El plan gratuito tiene una cuota de compilaciones y cola de baja prioridad; comprobar el saldo en Expo antes de iniciar.
8. Descargar e instalar la APK en el teléfono. Probar inicio de sesión, foto, guardado en Drive, detalle, permisos de empresa, revisión de otro supervisor y recuperación de contraseña. Usar cuentas y boletas de prueba.

Estos pasos describen la preparación pendiente; todavía no se ha creado un túnel, publicado la aplicación ni generado una APK.

## Segunda etapa: servicio independiente del computador

Para que funcione con el computador apagado hay que alojar también la API y SQL Server. La conexión Windows actual necesita adaptarse antes de usar un alojamiento Linux habitual. Elegir primero el destino y las condiciones gratuitas; no migrar los datos ni activar recursos de pago durante esta elección.

Se puede evaluar una oferta gratuita de Azure SQL, comprobando elegibilidad, límites y suspensión al agotar la cuota en la suscripción concreta. Esto no incluye automáticamente el alojamiento de la API. Conservar una copia de seguridad y la clave que cifra las credenciales de Drive al preparar cualquier migración.

Una dirección gratuita del proveedor puede servir para empezar. Un dominio propio se compra por separado. Un túnel temporal sirve para pruebas, pero no sustituye un despliegue permanente.

## Versionado

Revisar los cambios en una rama de trabajo, validar antes de integrarlos en develop y promover a main solamente la versión comprobada. Registrar en la entrega qué se publicó y cómo volver a la versión anterior. Nunca subir backend/.env, contraseñas SMTP, tokens de Drive, claves de cifrado ni credenciales de firma Android al repositorio.

## Referencias

- APK e instalación directa: https://docs.expo.dev/build-reference/apk/
- Plan gratuito y cuotas de Expo: https://docs.expo.dev/billing/plans/
- Túneles temporales de Cloudflare: https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/
- Oferta de Azure SQL a evaluar: https://learn.microsoft.com/en-us/azure/azure-sql/database/free-tier
