# Guardar cambios y entregar una versión

## Ramas

- `feature/...` o `fix/...`: desarrollar y revisar cada cambio.
- `develop`: integrar cambios para probarlos juntos.
- `main`: versión aprobada para producción.

Actualmente el repositorio no tiene una rama `prod` ni un proceso de despliegue automatizado configurado. Usar `main` como referencia de producción evita una rama adicional sin función definida. Un push guarda código en GitHub; no publica por sí solo una aplicación.

## Paso a paso para cada cambio nuevo

1. Empezar desde `develop` actualizado y crear una rama: `git switch -c feature/nombre-del-cambio`.
2. Implementar un cambio concreto, mostrarlo al usuario y verificarlo.
3. Revisar `git status` y `git diff`. Seleccionar los archivos con `git add ruta/al/archivo`.
4. Crear el commit: `git commit -m "feat: descripción del cambio"`. El commit guarda una versión local.
5. Subir la rama: `git push -u origin feature/nombre-del-cambio`. El push respalda esos commits en GitHub.
6. Abrir un pull request de la rama hacia `develop`, revisar y aprobar. Integrar cuando las pruebas pasen.
7. Probar la versión integrada con datos y servicios de prueba, incluyendo SQL Server y Drive.
8. Abrir un pull request de `develop` hacia `main`. Revisar las migraciones y aprobar la entrega.
9. Desplegar frontend y backend al ambiente productivo y aplicar sus migraciones con respaldo previo. Comprobar login, permisos y registro de una boleta.
10. Etiquetar la versión entregada cuando se defina la numeración del proyecto.

Antes de iniciar una nueva rama, el árbol de trabajo debe estar limpio. Cambiar de rama con cambios sin commit puede trasladar esos mismos archivos a la rama nueva: no guarda una versión.

## Verificación local

Desde `backend`: `npm test` y `npm run typecheck`. Las pruebas SQL necesitan un SQL Server local accesible con las variables de entorno del backend; usan tablas temporales para no modificar registros reales.

Desde `mobile`: `npx tsc --noEmit` y revisión en la aplicación. Las credenciales `.env`, dependencias, archivos temporales y fotografías locales no deben subirse a Git.

## Guardado del 22 de octubre de 2026

Los avances anteriores estaban acumulados sin commits intermedios. Se guardan como una versión integrada probada, más un commit de documentación. Estos commits no reconstruyen las etapas históricas de cada pantalla. A partir de aquí, crear un commit por cada cambio revisado.

La integración incluye acceso por empresa y rol, respaldo en Drive, detalle y edición de boletas pendientes, revisión, correcciones administrativas auditadas, gestión de trabajadores, tableros y perfil. Las migraciones 014 y 015 deben aplicarse en cualquier otro ambiente antes de usar esa versión.

Los pendientes del supervisor y la aprobación de gastos propios están documentados por separado; no están implementados. El despliegue productivo requiere definir alojamiento, configuración, base de datos, respaldos y procedimiento de migración. No se considera realizado por subir esta rama.
