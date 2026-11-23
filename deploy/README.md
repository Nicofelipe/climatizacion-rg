# Publicar Clepit Gestión de Boletas en boletas.clepit.cl

La app se suma al servidor que ya usa Clepit: comparte su SQL Server y su Caddy (HTTPS automático), con base y usuario propios.
No publica puertos ni modifica la otra app. Todo corre en Docker; el notebook deja de participar.

| Dirección | Qué es |
|---|---|
| `https://boletas.clepit.cl` | Web |
| `https://boletas.clepit.cl/api` | API de la web y de la app Android |

## Antes de empezar

1. **DNS:** en NIC Chile (o donde esté la zona de `clepit.cl`), un registro **A** `boletas` con la misma IP que `app.clepit.cl`.
2. **Google Cloud**, en el cliente OAuth de esta app, agregar como URI de redirección:
   - `https://boletas.clepit.cl/api/storage/google-drive/callback`
   - `https://boletas.clepit.cl/api/auth/google/callback`
   Si la pantalla de consentimiento está en «Testing», los permisos de Drive vencen a los 7 días: hay que pasarla a producción.
3. **Memoria:** el servidor tiene 4 GB y SQL Server puede usar hasta 2 GB. Esta app se limita a 512 MB. Revisar con `free -m`;
   si quedan menos de 700 MB disponibles, conviene un plan mayor.

## Pasos en el servidor (una vez)

```bash
git clone <repositorio> clepit-boletas && cd clepit-boletas
sudo bash deploy/setup.sh                       # claves, carpetas y respaldo diario
sudo nano deploy/.env                           # completar Google, STORAGE_ENCRYPTION_KEY y CLEPIT_DEPLOY_DIR
sudo bash deploy/restore-db.sh ClimatizacionRG.bak   # trae los datos actuales y aplica migraciones
sudo bash deploy/start.sh
```
Luego agregar el bloque de `deploy/Caddyfile.boletas` al `Caddyfile` de Clepit y recargar Caddy.

### Traer los datos del notebook

```sql
BACKUP DATABASE [ClimatizacionRG] TO DISK = N'C:\Temp\ClimatizacionRG.bak' WITH COPY_ONLY, CHECKSUM;
```
Detener antes el backend del notebook para no perder boletas registradas durante el traspaso. `STORAGE_ENCRYPTION_KEY` debe ser
la misma del `backend/.env` actual, o habrá que volver a conectar Drive. Copiar el archivo con `scp` y las claves directamente en
el servidor, nunca por chat.

### Actualizar
```bash
cd clepit-boletas && git pull && sudo bash deploy/start.sh
```
Si hay migraciones pendientes, `start.sh` respalda la base antes de aplicarlas.

## Después de publicar

- Instalar la APK 1.2.0 como actualización (misma firma y paquete). Las versiones anteriores apuntan al túnel y dejan de servir.
- Comprobar: entrar con clave y con Google, registrar una boleta con foto, aprobarla, descargar el Excel, y en el log `docker compose logs boletas`.
- Configurar `RCLONE_REMOTE` para que los respaldos salgan del servidor, y probar una restauración.
- Apagar el backend y los túneles del notebook, y quitar el sitio de pruebas de Render.

## Seguridad

- El usuario `boletas_app` lee y escribe datos, pero no cambia tablas y no puede modificar ni borrar el historial de auditoría.
- Las migraciones usan la cuenta de administración de SQL Server solo mientras corren; la app nunca la recibe.
- Política de contenido estricta, sin scripts externos. La lectura de boletas se hace en el equipo de cada persona.
- `deploy/.env` (permiso 600) y `deploy/data` quedan fuera de Git.
- Una sola réplica: los límites de intentos y el bloqueo de operaciones viven en memoria.
