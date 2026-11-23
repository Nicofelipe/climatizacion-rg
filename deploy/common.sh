#!/usr/bin/env bash
# Funciones compartidas. Se carga con: source common.sh
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
[[ -f .env ]] || { echo "Falta deploy/.env (ejecuta setup.sh)." >&2; exit 1; }
set -a; source .env; set +a
[[ -f "$CLEPIT_DEPLOY_DIR/.env" ]] || { echo "No se encontró $CLEPIT_DEPLOY_DIR/.env (revisa CLEPIT_DEPLOY_DIR)." >&2; exit 1; }
DB=ClepitBoletas
# La clave de administración se lee de la app Clepit y solo se usa en estos scripts.
SA_PASSWORD=$(grep -E '^SA_PASSWORD=' "$CLEPIT_DEPLOY_DIR/.env" | cut -d= -f2-)
clepit() { docker compose --project-directory "$CLEPIT_DEPLOY_DIR" -f "$CLEPIT_DEPLOY_DIR/docker-compose.yml" "$@"; }
sql() { clepit exec -T -e SQLCMDPASSWORD="$SA_PASSWORD" db /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -b "$@"; }
db_exists() { sql -h -1 -W -Q "SET NOCOUNT ON; SELECT CASE WHEN DB_ID('$DB') IS NULL THEN 'no' ELSE 'si' END" | grep -q si; }

# Usuario de la app: lee y escribe datos, no cambia tablas y no puede alterar el historial de auditoría.
grant_app_user() {
  sql -Q "IF SUSER_ID('boletas_app') IS NULL CREATE LOGIN [boletas_app] WITH PASSWORD = N'$BOLETAS_DB_PASSWORD', CHECK_POLICY = ON;
    ELSE ALTER LOGIN [boletas_app] WITH PASSWORD = N'$BOLETAS_DB_PASSWORD';"
  sql -d "$DB" -Q "IF USER_ID('boletas_app') IS NOT NULL DROP USER [boletas_app];
    CREATE USER [boletas_app] FOR LOGIN [boletas_app];
    ALTER ROLE db_datareader ADD MEMBER [boletas_app]; ALTER ROLE db_datawriter ADD MEMBER [boletas_app];
    DENY UPDATE, DELETE ON dbo.AuditLog TO [boletas_app];
    IF OBJECT_ID('dbo.SchemaMigration') IS NOT NULL DENY INSERT, UPDATE, DELETE ON dbo.SchemaMigration TO [boletas_app];"
}
# Las migraciones usan la cuenta de administración; la app nunca la recibe.
migrate() { docker compose run --rm --no-deps -e DB_ADMIN_USER=sa -e DB_ADMIN_PASSWORD="$SA_PASSWORD" boletas node dist/database/migrate.js "$@"; }
