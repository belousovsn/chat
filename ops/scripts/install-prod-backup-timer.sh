#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${1:-/srv/chat}"
SYSTEMD_DIR="${SYSTEMD_DIR:-/etc/systemd/system}"
SERVICE_NAME="chat-backup.service"
TIMER_NAME="chat-backup.timer"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root so systemd unit files can be installed." >&2
  exit 1
fi

if [[ ! -d "$APP_DIR" ]]; then
  echo "App directory does not exist: $APP_DIR" >&2
  exit 1
fi

for file in "$SERVICE_NAME" "$TIMER_NAME"; do
  if [[ ! -f "$APP_DIR/ops/systemd/$file" ]]; then
    echo "Missing unit template: $APP_DIR/ops/systemd/$file" >&2
    exit 1
  fi
done

mkdir -p "$SYSTEMD_DIR"

escaped_app_dir="$(printf '%s\n' "$APP_DIR" | sed 's/[\\/&]/\\&/g')"

sed "s/__APP_DIR__/$escaped_app_dir/g" "$APP_DIR/ops/systemd/$SERVICE_NAME" > "$SYSTEMD_DIR/$SERVICE_NAME"
sed "s/__APP_DIR__/$escaped_app_dir/g" "$APP_DIR/ops/systemd/$TIMER_NAME" > "$SYSTEMD_DIR/$TIMER_NAME"

chmod 0644 "$SYSTEMD_DIR/$SERVICE_NAME" "$SYSTEMD_DIR/$TIMER_NAME"

systemctl daemon-reload
systemctl enable --now "$TIMER_NAME"
systemctl status "$TIMER_NAME" --no-pager
systemctl list-timers "$TIMER_NAME" --no-pager
