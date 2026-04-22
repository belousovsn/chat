#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:-${XMPP_DOMAIN:-}}"
TARGET_DIR="${2:-/srv/chat/certs/xmpp}"

if [[ -z "$DOMAIN" ]]; then
  echo "Usage: $0 <xmpp-domain> [target-dir]" >&2
  exit 1
fi

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root so certificate files can be copied and ownership adjusted." >&2
  exit 1
fi

SOURCE_DIR="/etc/letsencrypt/live/$DOMAIN"

if [[ ! -f "$SOURCE_DIR/fullchain.pem" || ! -f "$SOURCE_DIR/privkey.pem" ]]; then
  echo "Missing Let's Encrypt files in $SOURCE_DIR" >&2
  exit 1
fi

mkdir -p "$TARGET_DIR"
cp "$SOURCE_DIR/fullchain.pem" "$TARGET_DIR/fullchain.pem"
cp "$SOURCE_DIR/privkey.pem" "$TARGET_DIR/privkey.pem"
chown 9000:9000 "$TARGET_DIR/fullchain.pem" "$TARGET_DIR/privkey.pem"
chmod 640 "$TARGET_DIR/fullchain.pem" "$TARGET_DIR/privkey.pem"

echo "Refreshed XMPP certs in $TARGET_DIR for $DOMAIN"
