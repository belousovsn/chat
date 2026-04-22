#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 3 || $# -gt 4 ]]; then
  echo "Usage: $0 <user-a> <user-b> <domain> [group]" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

USER_A="$1"
USER_B="$2"
DOMAIN="$3"
GROUP_NAME="${4:-Contacts}"

COMPOSE_ARGS=()
if [[ -n "${COMPOSE_ENV_FILE:-}" ]]; then
  COMPOSE_ARGS+=(--env-file "$COMPOSE_ENV_FILE")
fi
COMPOSE_ARGS+=(-f "${COMPOSE_FILE:-docker-compose.yml}")

SERVICE_NAME="${XMPP_SERVICE_NAME:-xmpp}"

docker compose "${COMPOSE_ARGS[@]}" exec -T "$SERVICE_NAME" \
  ejabberdctl add_rosteritem "$USER_A" "$DOMAIN" "$USER_B" "$DOMAIN" "$USER_B" "$GROUP_NAME" both

docker compose "${COMPOSE_ARGS[@]}" exec -T "$SERVICE_NAME" \
  ejabberdctl add_rosteritem "$USER_B" "$DOMAIN" "$USER_A" "$DOMAIN" "$USER_A" "$GROUP_NAME" both
