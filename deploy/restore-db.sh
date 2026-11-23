#!/usr/bin/env bash
# Restaura un respaldo (.bak o .bak.gz) como base ClepitBoletas, aplica migraciones y crea el usuario limitado.
#   bash deploy/restore-db.sh /ruta/ClimatizacionRG.bak
# No toca la base de la otra app. Si ClepitBoletas ya existe, la respalda y pide escribir RESTAURAR.
src=$(realpath "${1:?Indica el archivo .bak}")
source "$(dirname "$0")/common.sh"
if db_exists; then
  echo "La base $DB YA EXISTE. Se respaldará y luego se reemplazará."
  # Sin terminal se puede confirmar con CONFIRMAR=RESTAURAR.
  ok=${CONFIRMAR:-}
  [[ -n "$ok" ]] || read -r -p "Escribe RESTAURAR para continuar: " ok || true
  [[ "$ok" == RESTAURAR ]] || { echo "Cancelado."; exit 1; }
  bash ./backup.sh
fi
docker compose stop boletas 2>/dev/null || true
shared="$CLEPIT_DEPLOY_DIR/data/sql-backups"
name="boletas-restore-$(date +%s).bak"
trap 'rm -f "$shared/$name"' EXIT
if [[ "$src" == *.gz ]]; then gunzip -c "$src" > "$shared/$name"; else cp "$src" "$shared/$name"; fi
chmod 644 "$shared/$name"
files=$(sql -h -1 -W -s '|' -Q "SET NOCOUNT ON; RESTORE FILELISTONLY FROM DISK = N'/var/opt/mssql/backup/$name'")
data=$(echo "$files" | awk -F'|' '$3=="D"{print $1; exit}')
log=$(echo "$files" | awk -F'|' '$3=="L"{print $1; exit}')
[[ -n "$data" && -n "$log" ]] || { echo "No se pudieron leer los archivos del respaldo." >&2; exit 1; }
sql -Q "IF DB_ID('$DB') IS NOT NULL ALTER DATABASE [$DB] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
RESTORE DATABASE [$DB] FROM DISK = N'/var/opt/mssql/backup/$name' WITH REPLACE, CHECKSUM,
  MOVE N'$data' TO N'/var/opt/mssql/data/$DB.mdf', MOVE N'$log' TO N'/var/opt/mssql/data/${DB}_log.ldf';
ALTER DATABASE [$DB] SET MULTI_USER; ALTER DATABASE [$DB] SET RECOVERY SIMPLE;"
docker compose build boletas
migrate
grant_app_user
sql -d "$DB" -h -1 -W -Q "SET NOCOUNT ON; SELECT CONCAT('Empresas: ',(SELECT COUNT(*) FROM dbo.Company),'  Personas: ',(SELECT COUNT(*) FROM dbo.AppUser),'  Boletas: ',(SELECT COUNT(*) FROM dbo.Expense));"
echo "Restauración lista. Compara los totales con el computador de origen y ejecuta deploy/start.sh"
