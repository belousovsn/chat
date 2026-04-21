#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env.production ]]; then
  echo "Missing .env.production in $ROOT_DIR" >&2
  exit 1
fi

set -a
. ./.env.production
set +a

BACKUP_ROOT="${BACKUP_DIR:-$ROOT_DIR/backups}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TARGET_DIR="$BACKUP_ROOT/$TIMESTAMP"

mkdir -p "$TARGET_DIR"

echo "Creating backup under $TARGET_DIR"

docker compose --env-file .env.production -f docker-compose.prod.yml exec -T db \
  pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --clean --if-exists --no-owner --no-privileges \
  > "$TARGET_DIR/postgres.sql"

docker compose --env-file .env.production -f docker-compose.prod.yml exec -T app \
  sh -lc 'cd /app && tar -czf - uploads' \
  > "$TARGET_DIR/uploads.tar.gz"

git rev-parse HEAD > "$TARGET_DIR/git-rev.txt" 2>/dev/null || true
docker compose --env-file .env.production -f docker-compose.prod.yml ps > "$TARGET_DIR/compose-ps.txt"
sha256sum "$TARGET_DIR"/postgres.sql "$TARGET_DIR"/uploads.tar.gz > "$TARGET_DIR/checksums.txt"

echo "Backup complete: $TARGET_DIR"
