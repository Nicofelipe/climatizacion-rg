# Alta inicial de una empresa

## 1. Reunir los datos

Anotar el nombre y RUT de la empresa, el correo de su primer administrador y el correo Google que guardará sus boletas. El correo del respaldo puede ser distinto del correo con que entra el administrador. Pedir nombre, apellido, correo, teléfono y rol de cada integrante. Nunca pedir por chat sus contraseñas de Google.

El remitente de recuperación pertenece a la instalación de la aplicación: hoy está configurado Gmail localmente. No se configura un SMTP nuevo por trabajador ni por empresa; la aplicación envía a cada persona registrada su propio enlace.

## 2. Crear empresa y primer administrador

El responsable técnico crea el registro de empresa y su primer administrador en SQL Server, siguiendo el esquema actual y los procedimientos de alta existentes. Todavía no existe una pantalla de alta de empresas: no basta con registrarla como trabajador. No ejecutar semillas de prueba sobre datos de clientes. Registrar la intervención y el CompanyId asignado.

## 3. Preparar Google Cloud

Usar el proyecto OAuth de la aplicación. Habilitar Drive API y conservar el cliente web, sus secretos privados y ambos callbacks: `/api/storage/google-drive/callback` y `/api/auth/google/callback`, con el dominio HTTPS del backend. Durante las pruebas OAuth, agregar los correos Google que deban autorizar Drive o iniciar sesión como usuarios de prueba.

Esto se prepara por instalación; no reemplazar el cliente OAuth global al incorporar otra empresa.

## 4. Asignar el respaldo de Drive

Seguir [Configurar Google Drive](README-CONFIGURAR-DRIVE.md), secciones 5 a 7. Cada empresa tiene su carpeta raíz fija y su autorización cifrada en SQL Server. El permiso actual drive.file exige que la aplicación tenga acceso específico a la carpeta; pegar un enlace por sí solo no concede ese acceso. El alta de una carpeta completamente nueva todavía requiere aprovisionamiento técnico, pues no hay selector Google Picker en la aplicación.

El administrador autoriza la cuenta de respaldo y verifica la conexión en Perfil → Conectar Google Drive. Los trabajadores no realizan este paso. Conservar la clave de cifrado existente al reiniciar o trasladar el backend.

## 5. Registrar a los integrantes

Desde Equipo, el administrador registra nombre, apellido, correo, contraseña inicial confirmada, teléfono y rol. Trabajador es el rol predeterminado. Asignar Supervisor / administrador únicamente a quien debe revisar rendiciones y administrar el equipo.

La contraseña requiere ocho caracteres como mínimo, mayúscula, minúscula y número. Comunicarla por un canal privado. La persona puede cambiarla desde Perfil; el plazo para reemplazar la inicial empieza con su primer inicio de sesión y dura 48 horas. Para acceso Google, el correo debe estar previamente registrado; Google no crea una cuenta ni asigna un rol automáticamente.

## 6. Verificar las aprobaciones

Con un solo administrador activo, sus nuevas boletas propias se aprueban automáticamente. Al existir dos o más, las nuevas boletas propias requieren otro administrador; nadie aprueba la suya. El número se determina con las cuentas activas, sin una casilla manual. Las aprobaciones anteriores se conservan.

## 7. Hacer una prueba de entrega

Entrar como trabajador, subir una boleta con foto y comprobar su carpeta de año/mes y su detalle. Revisarla con otro usuario autorizado y comprobar la auditoría. Verificar que el trabajador no ve boletas ajenas y que el administrador solo ve su empresa. Probar un correo de recuperación nuevo desde el teléfono, cambiar la contraseña y comprobar que el enlace usado ya no sirve. Conservar un respaldo de SQL Server y de la configuración privada.

## 8. Configurar la dirección pública una vez por instalación

En Render Static Site: raíz `mobile`, compilación `npm ci && npx expo export --platform web`, publicación `dist`. Definir `EXPO_PUBLIC_API_URL=https://DOMINIO-API/api` antes de compilar. Para rutas dinámicas de detalle, agregar al final una regla Rewrite `/expenses/*` → `/index.html`; las páginas estáticas existentes tienen prioridad.

En backend/.env: `PASSWORD_RESET_URL=https://DOMINIO-WEB/reset-password`, ambos callbacks Google HTTPS y `GOOGLE_LOGIN_APP_REDIRECTS` con `https://DOMINIO-WEB/google-login,climatizacion-rg://google-login`. Registrar los callbacks exactamente en Google Cloud. Reiniciar el backend, reconstruir la web y pedir correos nuevos. Nunca publicar el archivo .env ni copiar sus secretos a variables EXPO_PUBLIC.

La web en Render puede tener dirección fija; mientras la API use un túnel temporal y SQL local, el computador debe permanecer encendido. Recrear ese túnel obliga a actualizar la dirección de API y recompilar web/APK. Ver [Publicación y Android](PUBLICAR-Y-PROBAR-ANDROID.md).
