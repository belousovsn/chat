#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 3 ]]; then
  echo "Usage: $0 <username> <domain> <password>" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_ARGS=()
if [[ -n "${COMPOSE_ENV_FILE:-}" ]]; then
  COMPOSE_ARGS+=(--env-file "$COMPOSE_ENV_FILE")
fi
COMPOSE_ARGS+=(-f "${COMPOSE_FILE:-docker-compose.yml}")

docker compose "${COMPOSE_ARGS[@]}" exec -T "${XMPP_SERVICE_NAME:-xmpp}" \
  ejabberdctl register "$1" "$2" "$3"
