#!/usr/bin/env bash
set -euo pipefail

if [[ "${CONFIRM_RESTORE:-}" != "YES" ]]; then
  echo "Restore is destructive. Re-run with CONFIRM_RESTORE=YES." >&2
  exit 1
fi

if [[ $# -ne 1 ]]; then
  echo "Usage: CONFIRM_RESTORE=YES $0 <backup-directory>" >&2
  exit 1
fi

BACKUP_DIR="$1"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env.production ]]; then
  echo "Missing .env.production in $ROOT_DIR" >&2
  exit 1
fi

set -a
. ./.env.production
set +a

if [[ ! -f "$BACKUP_DIR/postgres.sql" || ! -f "$BACKUP_DIR/uploads.tar.gz" ]]; then
  echo "Backup directory must contain postgres.sql and uploads.tar.gz" >&2
  exit 1
fi

echo "Stopping app container for restore"
docker compose --env-file .env.production -f docker-compose.prod.yml stop app

echo "Restoring database"
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T db \
  psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
  < "$BACKUP_DIR/postgres.sql"

echo "Restoring uploads"
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm -T app \
  sh -lc 'rm -rf /app/uploads && mkdir -p /app && tar -xzf - -C /app' \
  < "$BACKUP_DIR/uploads.tar.gz"

echo "Starting app container"
docker compose --env-file .env.production -f docker-compose.prod.yml start app

echo "Restore complete"
