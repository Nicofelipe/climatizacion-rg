#!/usr/bin/env bash
# Construye e inicia (o actualiza) la app. Seguro de repetir: respalda la base antes de migrar.
source "$(dirname "$0")/common.sh"

docker compose build boletas
if db_exists; then
  if ! migrate --status | grep -q ' 0 pendientes'; then
    bash ./backup.sh
    migrate
  fi
else
  echo "La base $DB no existe: se crea vacía."
  migrate --create
fi
grant_app_user
docker compose up -d boletas
for _ in $(seq 1 30); do
  [[ "$(docker inspect -f '{{.State.Health.Status}}' "$(docker compose ps -q boletas)" 2>/dev/null)" == healthy ]] && { echo "Listo: https://$BOLETAS_DOMAIN"; exit 0; }
  sleep 3
done
echo "La app no respondió. Revisa: docker compose logs --tail 80 boletas" >&2
exit 1
