# Clepit Gestión de Boletas

App para que los trabajadores rindan boletas con una foto y la empresa las revise, apruebe y lleve a la contadora.
Android y web, para varias empresas con sus datos separados.

| Carpeta | Qué es |
|---|---|
| [backend](backend) | API en Node 24 + Express + TypeScript |
| [mobile](mobile) | App Android y web con Expo 57 (React Native) |
| [database](database) | Migraciones de SQL Server |
| [deploy](deploy) | Publicación en `boletas.clepit.cl` |
| [docs](docs) | Reglas, guías y revisiones |

## Probar en este computador

Requiere Node 24, SQL Server local y el controlador ODBC 18. La demostración usa una base desechable con datos ficticios.

```powershell
npm --prefix mobile ci
npm --prefix backend ci
npm --prefix mobile run build:web
npm --prefix backend run demo
```
Abre `http://localhost:3100`. Las cuentas ficticias aparecen en la consola.

## Verificar

```powershell
npm --prefix backend run typecheck
npm --prefix mobile run typecheck
$env:TEST_DATABASE = 'ClepitBoletas_Test'; npm --prefix backend test
```
Con `TEST_DATABASE` también corre el recorrido completo por HTTP. GitHub ejecuta lo mismo en cada cambio.

## Base de datos

`npm --prefix backend run migrate -- --status` muestra las migraciones pendientes sin cambiar nada; sin `--status` las aplica.
Respalda siempre antes de migrar una base con datos reales.

## Guías

- [Reglas de negocio: IVA, duplicados, lectura y revisión](docs/REGLAS-DE-NEGOCIO.md)
- [Publicar en boletas.clepit.cl](deploy/README.md)
- [Cambios de la versión 1.2.0](CHANGELOG.md)
- [Conectar Google Drive por empresa](docs/README-CONFIGURAR-DRIVE.md)
- [Inicio de sesión con Google](docs/INICIAR-SESION-CON-GOOGLE.md)
- [Contraseña inicial y plazo de 48 horas](docs/CONTRASENA-INICIAL.md)
- [Recuperar contraseña](docs/RECUPERAR-CONTRASENA.md)
- [Respaldos](docs/POLITICA-RESPALDOS.md)
- [Revisión de seguridad de octubre](docs/REVISION-SEGURIDAD-2026-10-22.md)
