#!/usr/bin/env bash
# Respaldo diario (cron 03:45): base verificada, fotos locales y claves. Conserva 30 días y copia fuera si hay RCLONE_REMOTE.
source "$(dirname "$0")/common.sh"
stamp=$(date +%Y-%m-%d_%H%M)
out=data/backups
mkdir -p "$out"; chmod 700 "$out"
bak="$DB-$stamp.bak"

sql -Q "BACKUP DATABASE [$DB] TO DISK = N'/var/opt/mssql/backup/$bak' WITH INIT, CHECKSUM; RESTORE VERIFYONLY FROM DISK = N'/var/opt/mssql/backup/$bak' WITH CHECKSUM;"
gzip -c "$CLEPIT_DEPLOY_DIR/data/sql-backups/$bak" > "$out/$bak.gz"
rm -f "$CLEPIT_DEPLOY_DIR/data/sql-backups/$bak"
# Sin las claves no se podrían leer los permisos de Drive de un respaldo.
tar -czf "$out/boletas-claves-$stamp.tar.gz" .env data/secrets
tar -czf "$out/boletas-fotos-$stamp.tar.gz" data/receipts
chmod 600 "$out"/*-"$stamp".*

if [[ -n "${RCLONE_REMOTE:-}" ]] && command -v rclone >/dev/null; then
  rclone copy "$out" "$RCLONE_REMOTE" --include "*-$stamp.*"
  rclone delete "$RCLONE_REMOTE" --min-age 30d || true
fi
find "$out" -name '*.gz' -mtime +30 -delete
echo "$(date '+%F %T') respaldo OK: $stamp"
