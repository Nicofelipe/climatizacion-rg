# Publicar y probar en Android

## Estado actual

El envío de recuperación con Gmail ya fue probado por el usuario: llegó el correo. La web de pruebas está publicada en https://climatizacion-rg-pruebas.onrender.com y el backend está configurado para que los nuevos correos apunten a su página /reset-password. El usuario confirmó que la recuperación pública funcionó en su prueba. La página respondió HTTP 200 y la API rechazó consultar boletas sin sesión con HTTP 401.

La web se desplegó en Render desde el commit a98a113 de feature/google-login-and-team-navigation, con despliegue automático desactivado. El commit 3399ffb de feature/android-preview-and-hosting añade preparación Android y documentación, sin cambiar las pantallas desplegadas. Los secretos permanecen locales.

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

La web y el túnel de pruebas ya fueron creados. La API sigue dependiendo de este computador. La APK local se compiló correctamente con Gradle: artifacts/climatizacion-rg-preview.apk, 46.806.439 bytes, Android 7 o superior, ARM64, paquete cl.rg.climatizacion, versión 1.0.0. SHA-256: BCF04B73A7C0B04D600E20307F78371CE9C1498ABB6256625FA34F39B9B09561. Se comprobó que incorpora la API HTTPS y no la dirección API localhost. Falta instalarla y probarla en el teléfono real. El perfil EAS queda como alternativa y todavía no se ha vinculado una cuenta Expo.

## Compilar la APK localmente en Windows

Con dependencias npm instaladas y las herramientas de Android Studio disponibles, desde la raíz del repositorio:

```powershell
.\scripts\build-android-preview.ps1 -ApiUrl 'https://DOMINIO-API/api'
```

El script permite indicar AndroidSdk y JavaHome si las herramientas están en otra ruta. Compila ARM64 por defecto, con el Java de Android Studio, conserva las variables anteriores de la consola y copia el resultado a artifacts/climatizacion-rg-preview.apk. Para otra arquitectura compatible, indicar Architecture (por ejemplo x86_64 para un emulador). La primera compilación descarga Gradle y componentes Android, por lo que puede tardar. Limita las tareas paralelas y ajusta la memoria de Gradle porque el primer intento con la configuración predeterminada agotó el espacio de metadatos de Java. Esta APK usa firma de desarrollo para pruebas internas; antes de distribuir una versión productiva se debe configurar una firma privada y custodiarla fuera de Git.

La APK incorpora la URL de API durante la compilación. Si cambia el túnel, reconstruirla. Los archivos Android generados, APK y capturas locales no se suben a Git.

Para copiarla al teléfono, conectar USB en modo transferencia de archivos y copiar artifacts/climatizacion-rg-preview.apk a Descargas; abrirla desde el teléfono para instalarla. Se requiere Android de 64 bits ARM para el perfil predeterminado. Revisar la instalación y el funcionamiento en el dispositivo real antes de entregar a un cliente.

Como alternativa de descarga temporal, ejecutar `node scripts/serve-preview-apk.cjs` desde la raíz y conectar un túnel al puerto 8079. Ese servidor escucha solo en 127.0.0.1 y entrega únicamente /climatizacion-rg-preview.apk; no permite listar ni descargar otros archivos del proyecto. Cerrar servidor y túnel cuando termine la prueba. El enlace de descarga no sustituye al túnel de la API.

## Segunda etapa: servicio independiente del computador

Para que funcione con el computador apagado hay que alojar también la API y SQL Server. La conexión Windows actual necesita adaptarse antes de usar un alojamiento Linux habitual. Elegir primero el destino y las condiciones gratuitas; no migrar los datos ni activar recursos de pago durante esta elección.

Azure queda descartado por decisión del usuario; no abrir recursos ni intentar utilizar una suscripción anterior.

Una alternativa a evaluar para independizar el computador es PostgreSQL en Neon Free y una API adaptada para Render. Neon anuncia un plan sin tarjeta y con cuotas. Requiere autorización para cambiar el motor: no es compatible directamente con nuestras consultas T-SQL, transacciones, migraciones y pruebas actuales. Se debe preparar en otra rama, validar la migración en una copia y mantener intacta la base SQL Server original. No se ha iniciado esa migración.

Render Free bloquea las conexiones SMTP salientes por 25, 465 y 587. El envío Gmail actual usa 587: antes de trasladar esa API, habría que incorporar un servicio de correo por HTTPS o Gmail API y probarlo. Subir solamente el backend rompería esa recuperación. Los límites gratuitos de Render también incluyen cuotas de transferencia y compilación; revisar el método de pago y límite de gasto de la cuenta antes de ampliar el uso. No se activó un plan de pago para esta prueba.

Para conservar SQL Server durante las pruebas, se mantiene la API en Windows. Si se necesita una dirección de API que no cambie al recrear el túnel, ngrok ofrece un dominio de desarrollo asignado por cuenta en su plan gratuito, con cuotas de tráfico. Evaluar su configuración y comportamiento antes de sustituir el túnel actual; sigue requiriendo el computador encendido.

Conservar una copia de seguridad y la clave que cifra las credenciales de Drive al preparar cualquier migración.

Una dirección gratuita del proveedor puede servir para empezar. Un dominio propio se compra por separado. Un túnel temporal sirve para pruebas, pero no sustituye un despliegue permanente.

## Versionado

Revisar los cambios en una rama de trabajo, validar antes de integrarlos en develop y promover a main solamente la versión comprobada. Registrar en la entrega qué se publicó y cómo volver a la versión anterior. Nunca subir backend/.env, contraseñas SMTP, tokens de Drive, claves de cifrado ni credenciales de firma Android al repositorio.

## Referencias

- APK e instalación directa: https://docs.expo.dev/build-reference/apk/
- Plan gratuito y cuotas de Expo: https://docs.expo.dev/billing/plans/
- Túneles temporales de Cloudflare: https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/
- PostgreSQL gratuito a evaluar, sin migración autorizada todavía: https://neon.com/pricing
- Dominio de desarrollo y límites de ngrok: https://ngrok.com/docs/pricing-limits/free-plan-limits
- Limitaciones de Render Free, SMTP y cuotas: https://render.com/docs/free
