# Configurar Google Drive por empresa

Esta guía es para el responsable técnico y el administrador. El trabajador no configura Google Cloud, no elige carpetas ni autoriza Drive: entra con su cuenta y adjunta la foto de su boleta.

**¿Se conserva al cerrar y levantar la aplicación? Sí.** La carpeta y la credencial cifrada están en SQL Server. Reiniciar el backend, cerrar el navegador o apagar el equipo no debería borrarlas. Debes conservar la misma base y la misma clave de cifrado del backend.

## 1. Entender las dos cuentas

| Cuenta | Para qué se usa |
| --- | --- |
| Cuenta del trabajador registrada en SQL Server | Entrar a la aplicación y registrar sus boletas |
| Cuenta de Google de respaldo de la empresa | Guardar las fotografías de todos sus trabajadores |

Por ejemplo: una persona entra con su correo personal, pertenece a la empresa A y sube una foto. El backend obtiene su empresa desde la sesión y usa la cuenta de respaldo y carpeta de A. La persona no necesita tener permisos directos sobre esa carpeta.

Cada empresa debe tener su propio registro de almacenamiento, carpeta raíz y autorización. Un mismo proyecto Cloud puede servir a varias empresas; este backend usa actualmente un cliente OAuth global y credenciales de respaldo por empresa. No cambies el cliente global al incorporar una empresa nueva.

## 2. Si Climatización RG ya tiene su carpeta

No repitas la configuración inicial ni crees una carpeta nueva.

1. Inicia sesión en la aplicación con la cuenta ADMIN de esa empresa.
2. Abre **Perfil → Conectar Google Drive**.
3. La pantalla debe indicar **Carpeta asignada · cambios bloqueados**.
4. Pulsa **Verificar conexión**.
5. Si dice que la conexión es correcta, termina aquí: ya está preparada para recibir fotos.
6. Si falla la autorización, sigue la sección 7. La renovación conserva el identificador de carpeta existente.

## 3. Preparar Google Cloud una vez por aplicación

Si tu proyecto ya está creado, revisa los datos existentes antes de crear otro.

1. Entra a [Google Cloud Console](https://console.cloud.google.com/).
2. Selecciona el proyecto **Climatización RG** o crea el proyecto correspondiente a esta aplicación.
3. Abre **APIs y servicios → Biblioteca**.
4. Busca **Google Drive API** y pulsa **Habilitar**, si todavía no está habilitada.
5. Abre **Google Auth Platform**. Según la interfaz, también puede aparecer como **Pantalla de consentimiento OAuth**.
6. En **Branding**, completa el nombre de la aplicación y los correos de soporte/contacto.
7. En **Audience**, configura el tipo de usuarios. Para una cuenta Gmail personal, el flujo es externo; Internal requiere una organización compatible de Google Workspace/Cloud Identity.
8. Mientras esté en pruebas, agrega como usuario de prueba el **correo de Google que será dueño o tendrá acceso al respaldo de la empresa**. No es necesario agregar a todos los trabajadores: no autorizan Drive.
9. En **Data Access**, declara el permiso que solicita el código:

   `https://www.googleapis.com/auth/drive.file`

10. En **Clients**, crea o revisa un cliente OAuth de tipo **Web application**. Este cliente corresponde al backend que recibe el retorno de Google, aunque el producto sea móvil.
11. En **Authorized redirect URIs**, registra exactamente:

    `http://localhost:3000/api/storage/google-drive/callback`

12. Para producción, registra además el callback HTTPS del backend real. La URL de producción debe coincidir con su variable `GOOGLE_REDIRECT_URI`.
13. Guarda Client ID y Client Secret en la configuración privada del backend. No los subas a GitHub.

No uses `http://localhost:8081/storage` como callback: esa es una pantalla del frontend; Google debe volver al backend.

## 4. Configuración privada del backend

El archivo local es `backend/.env`. Los valores siguientes son ejemplos, no credenciales reales:

```dotenv
PORT=3000
DB_SERVER=TU_SERVIDOR_SQL
DB_DATABASE=ClimatizacionRG
JWT_SECRET=UN_SECRETO_PRIVADO
JWT_EXPIRES_IN=8h
GOOGLE_CLIENT_ID=CLIENT_ID_DEL_PROYECTO
GOOGLE_CLIENT_SECRET=CLIENT_SECRET_DEL_PROYECTO
GOOGLE_REDIRECT_URI=http://localhost:3000/api/storage/google-drive/callback
STORAGE_ENCRYPTION_KEY=CLAVE_HEXADECIMAL_DE_64_CARACTERES
```

- `STORAGE_ENCRYPTION_KEY` cifra la autorización guardada en SQL Server. Debe representar 32 bytes: 64 caracteres hexadecimales.
- En una instalación nueva, el responsable técnico genera la clave una sola vez y la guarda en un gestor de secretos.
- **Si ya hay credenciales guardadas, no reemplaces esa clave al reiniciar.** De lo contrario no podrán descifrarse.
- Conserva una copia segura de la configuración y de la base de datos.
- Las claves y tokens nunca van en el frontend ni en archivos versionados.
- Reinicia el backend después de cambiar `.env`.

## 5. Crear y autorizar la carpeta de una empresa nueva

1. Entra a Google Drive con la cuenta de respaldo que corresponde a esa empresa.
2. Crea una carpeta raíz, por ejemplo **Boletas**, si aún no existe. Cada empresa debe tener una carpeta distinta.
3. Abre esa carpeta y copia su identificador. En un enlace como:

   `https://drive.google.com/drive/folders/IDENTIFICADOR_DE_CARPETA`

   el identificador es lo que aparece después de `/folders/`, sin parámetros adicionales.

4. El responsable técnico debe garantizar que la aplicación tenga autorización sobre esa carpeta y registrar la asociación del paso 6.

**Límite actual para empresas completamente nuevas:** `drive.file` no permite acceder a cualquier carpeta solo por copiar su enlace. La carpeta debe haber sido creada por esta aplicación o seleccionada/compartida con ella mediante un selector compatible, como Google Picker. La app actual permite renovar la autorización de una carpeta ya provisionada, pero todavía no incluye el selector técnico de alta inicial. Para una carpeta nueva, ese paso de autorización inicial requiere completar el aprovisionamiento técnico; esta guía no lo presenta como una función ya disponible.

Si al verificar obtienes “File not found” pese a usar el ID correcto, revisa tanto la cuenta autorizada como este permiso por carpeta. No amplíes automáticamente el permiso a todo Drive para ocultar el problema.

Para Climatización RG, cuya carpeta ya estaba asignada y fue verificada, corresponde reutilizar esa misma carpeta.

## 6. Asociar la carpeta a la empresa en SQL Server

Solo el responsable técnico realiza esta configuración inicial. Los empleados y administradores de empresa no pueden cambiarla desde la aplicación ni mediante su API.

Antes de comenzar, la empresa debe existir en `dbo.Company`. La base debe incluir `CompanyStorage` y `CompanyStorageCredential`; los scripts antiguos del repositorio aún necesitan reconciliarse con la estructura actual. No ejecutes las migraciones de creación sobre la base existente.

En SQL Server Management Studio, abre una consulta en la base correcta. Sustituye los dos valores de ejemplo del bloque siguiente. Este ejemplo solo crea una asociación nueva: si ya existe, se detiene sin cambiarla.

```sql
USE ClimatizacionRG;
GO
DECLARE @CompanyId int = 0; -- Reemplazar por el ID real de la empresa
DECLARE @FolderId nvarchar(255) = N'REEMPLAZAR_POR_ID_DE_CARPETA';

IF @CompanyId <= 0 OR @FolderId = N'REEMPLAZAR_POR_ID_DE_CARPETA'
    THROW 50001, 'Completa CompanyId y FolderId antes de ejecutar.', 1;

IF NOT EXISTS (SELECT 1 FROM dbo.Company WHERE Id = @CompanyId)
    THROW 50002, 'La empresa no existe.', 1;

IF EXISTS (
    SELECT 1 FROM dbo.CompanyStorage
    WHERE CompanyId = @CompanyId AND Provider = N'GOOGLE_DRIVE'
)
    THROW 50003, 'La empresa ya tiene configuración. No se cambiará.', 1;

INSERT INTO dbo.CompanyStorage (CompanyId, Provider, RootFolderId, IsActive)
VALUES (@CompanyId, N'GOOGLE_DRIVE', @FolderId, 1);
```

No insertes el refresh token manualmente en texto plano. El flujo de autorización lo guarda cifrado en `CompanyStorageCredential`.

## 7. Autorizar o renovar el acceso de la cuenta de respaldo

Este paso lo hace el administrador autorizado, no cada trabajador.

1. Levanta backend y frontend según el paso 9.
2. Entra como ADMIN de la empresa que estás configurando.
3. Abre **Perfil → Conectar Google Drive**.
4. Comprueba que aparece la carpeta ya asignada.
5. Pulsa **Preparar reconexión de Drive** y después **Autorizar en Google**.
6. En Google, elige la cuenta de respaldo de **esa empresa**, no necesariamente el correo con el que entraste a la aplicación.
7. Revisa y autoriza el permiso solicitado.
8. Google debe regresar a una página que diga **Google Drive conectado**.
9. Vuelve a la aplicación y pulsa **Verificar conexión**.
10. Debe indicar **Conexión correcta**. Después prueba el registro de una boleta con foto.

El backend conserva la carpeta y guarda/actualiza únicamente la credencial cifrada. Si autorizas una cuenta sin acceso a la carpeta, debes renovar el acceso con la cuenta correcta.

## 8. Probar como trabajador

1. Cierra sesión como administrador.
2. Entra con el correo y contraseña del trabajador previamente registrado en SQL Server.
3. Comprueba que Inicio indique **Acceso de trabajador**.
4. Abre **Boletas → Registrar boleta**.
5. Adjunta una foto, completa número, fecha, tipo y monto, y pulsa **Guardar boleta**.
6. Debe aparecer la confirmación de guardado.
7. Con la cuenta de respaldo, comprueba la foto en **Boletas → año → mes** de esa empresa.

El trabajador no debe ver botones para autorizar o cambiar Drive. El login con Google del trabajador no está implementado todavía: actualmente se utiliza correo y contraseña.

## 9. Cerrar y volver a levantar

Para detener los servidores que ejecutaste en terminales, usa `Ctrl+C` en cada una. No borres la base ni los archivos `.env`.

En una terminal PowerShell:

```powershell
Set-Location C:\Dev\climatizacion-rg\backend
npm run dev
```

En otra terminal:

```powershell
Set-Location C:\Dev\climatizacion-rg\mobile
npm run web -- --port 8081
```

Abre http://localhost:8081/.

Prueba de persistencia:

1. Antes de detener, entra como administrador y verifica la conexión.
2. Anota el identificador de carpeta mostrado, sin copiar tokens.
3. Detén y vuelve a levantar los servidores.
4. Inicia sesión nuevamente. Hoy la sesión del usuario está en memoria, por lo que puede pedirte el login otra vez; eso no borra la configuración de Drive.
5. Revisa que se muestre el mismo identificador de carpeta.
6. Pulsa **Verificar conexión**. No debería pedir una nueva autorización solo por haber reiniciado.
7. Prueba otra boleta y verifica que se guarde en la misma carpeta.

## 10. Qué puede fallar y qué revisar

### Prueba ejecutada el 22 de octubre de 2026

Se detuvo y volvió a levantar el backend local. Antes y después se consultó la configuración de la empresa 1, se comparó una huella de la carpeta y credencial cifrada (sin mostrar sus valores) y se verificó el acceso de lectura a la carpeta en Google Drive. Resultado: configuración idéntica y acceso correcto después del reinicio, sin nueva autorización. No se crearon ni modificaron boletas o fotografías. No se probó apagar Windows o restaurar una copia de SQL Server.

| Mensaje o problema | Qué revisar |
| --- | --- |
| `invalid_grant`, autorización expirada o revocada | Renovar autorización con la cuenta de respaldo. Revisar estado Testing en Cloud. |
| `redirect_uri_mismatch` | Callback idéntico en Cloud y `.env`, incluyendo protocolo, puerto y ruta. |
| `access_denied` | Cuenta de respaldo permitida como usuario de prueba y acceso autorizado. |
| Carpeta no encontrada | Cuenta correcta, ID correcto y autorización por carpeta para `drive.file`. |
| Fallo al descifrar credencial después de reiniciar | Restaurar la clave de cifrado original; no generar una nueva. |
| Sin carpeta asignada | Responsable técnico debe revisar CompanyId y CompanyStorage. El empleado no configura nada. |
| Sin conexión con SQL Server | Servicio SQL activo, mismo servidor/base y autenticación Windows del backend. |
| Ya existe boleta con ese número | Revisar los registros existentes de la empresa antes de reenviar. |

Si el proyecto OAuth es externo y está en **Testing**, Google documenta que los refresh tokens con permisos como Drive vencen a los siete días. Para uso estable, prepara la publicación adecuada del proyecto y los requisitos aplicables de Google. Pasar a producción no impide revocaciones o todas las demás causas de invalidación.

## 11. Conservación de respaldos

Mantener fija la carpeta no impide que su propietario borre archivos directamente en Drive. El requisito de conservar cinco años necesita además permisos, copias independientes, política de conservación y pruebas de restauración. Consulta `POLITICA-RESPALDOS.md`.

## Referencias oficiales

- [Habilitar Drive y preparar OAuth](https://developers.google.com/workspace/drive/api/quickstart/nodejs): los pasos del cliente de escritorio del ejemplo no reemplazan el cliente web que usa nuestro backend.
- [OAuth para aplicaciones de servidor](https://developers.google.com/identity/protocols/oauth2/web-server).
- [Permisos de Drive y alcance drive.file](https://developers.google.com/workspace/drive/api/guides/api-specific-auth).
- [Selector Google Picker](https://developers.google.com/workspace/drive/picker/guides/overview).
- [Expiración de refresh tokens](https://developers.google.com/identity/protocols/oauth2#expiration).
