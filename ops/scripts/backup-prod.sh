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

BACKUP_ROOT_RAW="${BACKUP_DIR:-$ROOT_DIR/backups}"
mkdir -p "$BACKUP_ROOT_RAW"
BACKUP_ROOT="$(cd "$BACKUP_ROOT_RAW" && pwd)"
LOCK_FILE="$BACKUP_ROOT/.backup-prod.lock"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TARGET_DIR="$BACKUP_ROOT/$TIMESTAMP"
COMPOSE_ARGS=(--env-file .env.production -f docker-compose.prod.yml)

if command -v flock >/dev/null 2>&1; then
  exec 9>"$LOCK_FILE"
  if ! flock -n 9; then
    echo "Another backup is already running." >&2
    exit 1
  fi
fi

mkdir -p "$TARGET_DIR"

echo "Creating backup under $TARGET_DIR"

docker compose "${COMPOSE_ARGS[@]}" exec -T db \
  pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --clean --if-exists --no-owner --no-privileges \
  > "$TARGET_DIR/postgres.sql"

docker compose "${COMPOSE_ARGS[@]}" exec -T app \
  sh -lc 'cd /app && tar -czf - uploads' \
  > "$TARGET_DIR/uploads.tar.gz"

git rev-parse HEAD > "$TARGET_DIR/git-rev.txt" 2>/dev/null || true
docker compose "${COMPOSE_ARGS[@]}" ps > "$TARGET_DIR/compose-ps.txt"
sha256sum "$TARGET_DIR"/postgres.sql "$TARGET_DIR"/uploads.tar.gz > "$TARGET_DIR/checksums.txt"

if [[ -n "${BACKUP_KEEP_DAYS:-}" ]]; then
  if [[ ! "${BACKUP_KEEP_DAYS}" =~ ^[0-9]+$ ]]; then
    echo "BACKUP_KEEP_DAYS must be an integer number of days." >&2
    exit 1
  fi

  if (( BACKUP_KEEP_DAYS > 0 )); then
    echo "Pruning backups older than $BACKUP_KEEP_DAYS days from $BACKUP_ROOT"
    find "$BACKUP_ROOT" \
      -mindepth 1 \
      -maxdepth 1 \
      -type d \
      -mtime +"$BACKUP_KEEP_DAYS" \
      ! -name "$TIMESTAMP" \
      -print \
      -exec rm -rf -- {} +
  fi
fi

echo "Backup complete: $TARGET_DIR"
