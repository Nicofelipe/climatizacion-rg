#!/usr/bin/env bash
# Prepara deploy/.env y las carpetas. Se ejecuta una vez en el servidor, como root. No inicia nada.
set -euo pipefail
cd "$(dirname "$0")"
[[ $EUID -eq 0 ]] || { echo "Ejecuta como root (sudo)." >&2; exit 1; }
docker network inspect clepit_internal >/dev/null 2>&1 || { echo "No existe la red clepit_internal: primero debe estar corriendo la app Clepit." >&2; exit 1; }

if [[ ! -f .env ]]; then
  gen() { echo "Bo$(openssl rand -base64 40 | tr -d '/+=\n' | cut -c1-36)7z"; }
  cp .env.example .env
  sed -i "s|^BOLETAS_DB_PASSWORD=.*|BOLETAS_DB_PASSWORD=$(gen)|; s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 48)|" .env
  chmod 600 .env
  echo "Creado deploy/.env con claves aleatorias. Completa las que faltan."
fi
# El contenedor corre como el usuario 1000 (node).
mkdir -p data/receipts data/secrets data/backups data/downloads
chown -R 1000:1000 data/receipts data/secrets
chmod 700 data/receipts data/secrets data/backups
cat > /etc/cron.d/clepit-boletas-backup <<CRON
45 3 * * * root $(pwd)/backup.sh >> $(pwd)/data/backups/backup.log 2>&1
CRON
chmod 644 /etc/cron.d/clepit-boletas-backup
echo "Memoria disponible:"; free -m | sed -n 1,3p
echo "Listo. Completa deploy/.env y ejecuta deploy/restore-db.sh (datos actuales) o deploy/start.sh (base nueva)."
