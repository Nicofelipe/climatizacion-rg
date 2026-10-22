# Revisión de seguridad — 22 de octubre de 2026

## Resultado

**Apta para continuar pruebas controladas. No aprobada todavía para lanzamiento productivo con datos de clientes.**

Esta es una revisión de código, dependencias, configuración y pruebas de regresión del proyecto. Incluye comprobaciones de lectura sobre SQL Server y Drive y solicitudes no autenticadas al enlace público. No es una certificación ni una prueba de penetración independiente; no se realizaron ataques de carga ni se modificaron contraseñas, cuentas o boletas reales.

## Correcciones realizadas

| Hallazgo | Corrección |
| --- | --- |
| Login sin límite de intentos | Límite por cuenta e IP, respuesta 429 con plazo de reintento y trabajo bcrypt también para correos desconocidos. Los límites son temporales; no se bloquea permanentemente una cuenta. |
| Cualquier origen web aceptado | Lista explícita de orígenes web autorizados. Las solicitudes nativas sin Origin siguen requiriendo su sesión. CORS complementa los permisos; no sustituye la autenticación. |
| Archivos aceptados solo por MIME declarado | Lista de formatos, comprobación de cabecera real, nombres aleatorios, límite de tamaño, campos y partes; rechazo de SVG/HTML y limpieza de archivos rechazados. No equivale a un antivirus ni a una decodificación completa de imagen. |
| Errores HTTP y caché | Respuestas JSON genéricas para errores, límites de cuerpo, Cache-Control no-store, Referrer-Policy no-referrer y menos información en health. |
| Proveedor de otra empresa | Validación del proveedor por empresa y estado; joins de lectura también restringidos a la misma empresa. |
| Aprobación durante una edición o carga | Bandera SQL de sincronización que impide revisar durante la operación; reversión limitada a pendientes. Bloqueo por boleta en el proceso para excluir edición, corrección y reintento de sincronización simultáneos. |
| Imagen anterior eliminada antes de terminar la operación | Se conserva en el respaldo privado al reemplazarla. No se elimina una imagen a la que podría necesitar volver una reversión. |
| Retiro de boleta sin auditoría | Baja lógica auditada; registro y foto permanecen. |
| Retorno de Drive reutilizable | Estado aleatorio de un solo uso y diez minutos; comprobación de administrador activo, empresa y versión de contraseña; comprobación de acceso a la carpeta fija antes de sustituir la credencial. Guardado cifrado y auditoría en transacción SQL con nueva comprobación de permisos. |
| Dependencias vulnerables del backend | Parches compatibles; Multer mínimo 2.4.0 y lockfile actualizado. Auditoría posterior: cero avisos npm en backend. |
| Node 20 fuera de soporte | Node 24.22.1 LTS descargado desde nodejs.org y comprobado con SHA-256. API iniciada con ese ejecutable. Script de inicio local y engines 24.x documentados. |
| API escuchando en la red local | Escucha por defecto en 127.0.0.1; el túnel HTTPS sigue siendo el acceso de prueba. HOST debe configurarse expresamente si cambia el alojamiento. |

La protección de fotos usa firmas de archivo y límites, pero no garantiza que cualquier archivo aceptado sea una imagen completamente válida. Para producción conviene incorporar decodificación segura, normalización y una política para imágenes malformadas sin romper fotos HEIC legítimas.

## Evidencia comprobada

- Suite final: 129 pruebas aprobadas, cero fallos, con Node 24.22.1. Tipos de backend y móvil sin errores; exportación web completada con los parches compatibles del móvil. Informe local: artifacts/security-tests.txt (excluido de Git).
- Pruebas SQL usan tablas temporales por conexión; no cambian registros reales. Cubren límites de empresa, propiedad, roles, estados, revisiones, correcciones y contraseñas.
- Pruebas HTTP: archivo HTML declarado JPG y SVG rechazados, formulario permitido, origen no autorizado rechazado, JSON malformado y exceso de tamaño sin stack trace.
- Enlace público: imagen sin sesión HTTP 401; origen ajeno HTTP 403; origen de la web publicada HTTP 200 y no-store.
- Drive de la empresa actualmente configurada: 12 elementos comprobados (carpeta y archivos registrados), cero permisos anyone, cero permisos de dominio, cero concesiones adicionales a colaboradores. No verifica archivos ajenos al inventario ni cambios futuros de permisos.
- Clave JWT de al menos 32 bytes, sin marcador de ejemplo detectado; clave de cifrado con formato de 32 bytes válido. No se imprimieron sus valores.
- Los archivos backend/.env y mobile/.env no aparecen versionados en las referencias Git locales comprobadas. No se encontraron los patrones de claves privadas y tokens buscados en el contenido actualmente versionado. Esto no garantiza que nunca haya existido otro secreto con un formato distinto ni cubre registros externos.
- Recuperación mantiene vencimiento de 20 minutos, uso único, invalidación de enlaces pendientes y sesiones anteriores; SQL guarda solo el hash del enlace.

## Pendientes que impiden aprobar producción

### 1. Identidad SQL con privilegios excesivos

La identidad actual tiene sysadmin=1 y db_owner=1. SQL Server está configurado solo para autenticación Windows. Se necesita una identidad Windows dedicada para ejecutar la API y un login/usuario SQL de esa identidad con permisos mínimos sobre las tablas necesarias, sin sysadmin ni db_owner. Auditoría debe permitir agregar eventos, pero impedir modificarlos o borrarlos desde la cuenta de aplicación.

No se cambió el modo de autenticación ni se reinició SQL Server, no se crearon cuentas de Windows y no se retiraron privilegios al usuario actual. Cambiarlo sin preparar la identidad del proceso podría interrumpir el acceso del usuario a sus proyectos. No requiere contratar Azure.

### 2. Avisos pendientes en Expo y sus dependencias

La auditoría inicial del móvil informó 37 avisos. Los parches compatibles redujeron el resultado a 23 (20 altos, 3 moderados). Incluye herramientas de compilación como Metro/braces, node-forge e image-size, y el decodificador de enlaces decode-uri-component usado por query-string/expo-router.

No todos son explotables desde la APK o la web; hay que cerrar la evaluación por ruta de ejecución. No exponer Metro a internet. No se ejecutó npm audit fix --force: npm proponía degradar Expo a 44 o migrar Router a 58, cambios incompatibles con la base SDK 57 sin una migración probada. El decodificador corregido 0.5 usa ESM; no debe sustituirse a ciegas dentro de un consumidor CommonJS.

Preparar una actualización soportada de Expo/Router, probar enlaces malformados, web y compilación nativa, y generar otra APK. La APK de pruebas anterior y la web desplegada desde a98a113 no incorporan estos parches móviles; las correcciones del backend sí están activas en la API local.

### 3. Operación y recuperación

El túnel y el computador local siguen siendo infraestructura de prueba. Antes del lanzamiento: alojamiento estable, certificado HTTPS, identidad de ejecución restringida, SQL sin exposición pública y validación de certificados al usar una conexión remota. La configuración SQL actual confía en el certificado del servidor para el entorno local; no trasladar esa excepción a internet.

Configurar y probar también las cabeceras de seguridad del frontend en su alojamiento, incluida una política CSP compatible con Expo y protección contra inclusión en marcos. Helmet protege las respuestas de la API; no configura las páginas HTML servidas por Render. No se realizó una auditoría completa del alojamiento web ni de su cuenta administrativa.

Definir respaldos independientes y comprobar una restauración real de SQL y de las fotos. Guardar por separado la clave que permite descifrar las credenciales de Drive. Drive no es un archivo inmutable: el dueño de la cuenta conserva capacidad para cambiar permisos o borrar archivos fuera de la aplicación. La retención requerida de cinco años no queda garantizada por la carpeta por sí sola.

Antes de habilitar varias réplicas: reemplazar mapas de límites/OAuth y bloqueos locales por almacenamiento y reservas compartidas, y una cola durable para Drive y correos. Una interrupción del proceso puede dejar una boleta marcada como sincronización pendiente: no se debe aprobar hasta reconciliarla. No se verificó una prueba de fallo de proceso y recuperación completa en esta revisión.

### 4. Entrega y cuentas

Revisar las cuentas de prueba y privilegios reales antes de incorporar clientes; firmar la APK con una clave privada de publicación y custodiarla fuera de Git. Probar en un teléfono la carga y reemplazo de fotos y la revisión con dos administradores después de los parches. Completar pruebas de Google con los callbacks HTTPS definitivos. Considerar MFA para administradores y protección de la cuenta de respaldo.

## Repetir las comprobaciones

Desde backend, con Node 24 LTS:

```powershell
node --test
npm run typecheck
npm audit --omit=dev
node scripts/check-runtime-security.cjs
node scripts/check-storage-permissions.cjs
```

Para el inicio local ya preparado: `scripts/start-backend-local.ps1` desde la raíz. Por defecto usa C:/Dev/tools/node24/node.exe; permite indicar NodePath. Las comprobaciones no imprimen correos, tokens o fotografías. Los informes de dependencias son una fotografía del momento: repetir antes de cada entrega.

## Fuentes

- Recuperación de contraseñas: https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html
- Versiones Node con soporte: https://nodejs.org/en/about/previous-releases
- Documentación SDK utilizado: https://docs.expo.dev/versions/v57.0.0/
- Avisos concretos: informe npm audit del repositorio y sus enlaces a GitHub Security Advisories.
