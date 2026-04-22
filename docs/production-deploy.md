# Production Deploy

This document captures the currently working production shape for the classic chat app.

Current live target:

- domain: `chat.memdecks.com`
- app host path: `/srv/chat`
- reverse proxy: `nginx`
- TLS: `certbot --nginx`
- runtime: `docker compose -f docker-compose.prod.yml`

## What Landed

Production-specific behavior now includes:

- Fastify trusts proxy headers so `nginx` forwarding behaves correctly.
- Session cookies become `Secure` automatically when `APP_URL` uses `https://`.
- Container startup can skip demo seed data with `RUN_SEED=false`.

Relevant files:

- [docker-compose.prod.yml](/C:/Users/sbelousov/Documents/Projects/DA_hackaton_chat/docker-compose.prod.yml)
- [.env.production.example](/C:/Users/sbelousov/Documents/Projects/DA_hackaton_chat/.env.production.example)
- [ops/nginx/chat.memdecks.com.conf](/C:/Users/sbelousov/Documents/Projects/DA_hackaton_chat/ops/nginx/chat.memdecks.com.conf)
- [docs/backup-and-restore.md](/C:/Users/sbelousov/Documents/Projects/DA_hackaton_chat/docs/backup-and-restore.md)
- [docs/xmpp-thin-slice.md](/C:/Users/sbelousov/Documents/Projects/DA_hackaton_chat/docs/xmpp-thin-slice.md)
- [ops/scripts/refresh-xmpp-certs.sh](/C:/Users/sbelousov/Documents/Projects/DA_hackaton_chat/ops/scripts/refresh-xmpp-certs.sh)

## One-Time Server Prep

On a fresh Ubuntu host:

1. Install Docker Engine and Compose v2.
2. Install `nginx`.
3. Point DNS for the chat hostname to the droplet.
4. Open inbound `80` and `443`.
5. Add swap if the box is memory-constrained.

The current droplet was also cleaned up from older containers and given a persistent `2G` swapfile.

## App Setup

1. Clone repo to `/srv/chat`.
2. Copy `.env.production.example` to `.env.production`.
3. Replace:
   - `APP_URL`
   - `SESSION_SECRET`
   - `POSTGRES_PASSWORD`
   - `DATABASE_URL`
   - `MAIL_FROM`
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_SECURE`
   - `SMTP_USER`
   - `SMTP_PASS`
   - `BACKUP_DIR` if you want backups outside `/srv/chat/backups`
   - `BACKUP_KEEP_DAYS` if you want automatic retention pruning
4. Keep `RUN_SEED=false` for public deployment unless you explicitly want demo users.

Important:

- `DATABASE_URL` and `POSTGRES_PASSWORD` must match.
- If you use a real SMTP provider, set both `SMTP_USER` and `SMTP_PASS` together.
- If you leave `mailpit` in place, password reset mail is still internal only.

## Launch

From `/srv/chat`:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

Expected runtime shape:

- `db` internal only
- `mailpit` internal only
- `app` bound to `127.0.0.1:8080`
- `nginx` publishes public `80/443`

## Nginx And TLS

1. Copy [ops/nginx/chat.memdecks.com.conf](/C:/Users/sbelousov/Documents/Projects/DA_hackaton_chat/ops/nginx/chat.memdecks.com.conf) to `/etc/nginx/sites-available/chat.memdecks.com`.
2. Symlink it into `/etc/nginx/sites-enabled/`.
3. Validate and reload:

```bash
nginx -t
systemctl reload nginx
```

4. Issue certificate:

```bash
apt-get update
apt-get install -y certbot python3-certbot-nginx
certbot --nginx --non-interactive --agree-tos --register-unsafely-without-email --redirect -d chat.memdecks.com
```

`certbot` will rewrite the site config to add TLS and HTTP-to-HTTPS redirect.

## Smoke Checks

Local checks on the server:

```bash
curl http://127.0.0.1:8080/api/health
curl -H 'Host: chat.memdecks.com' http://127.0.0.1/api/health
```

Public checks:

```bash
curl https://chat.memdecks.com/api/health
SMOKE_BASE_URL=https://chat.memdecks.com corepack pnpm smoke:prod
```

Good outcome:

- `/api/health` returns `{"ok":true,...}`
- app HTML loads from `/`
- register flow succeeds over HTTPS

Optional authenticated smoke:

```bash
SMOKE_BASE_URL=https://chat.memdecks.com \
SMOKE_EMAIL=admin@example.com \
SMOKE_PASSWORD=replace-me \
corepack pnpm smoke:prod
```

## Backups

Backup and restore guidance now lives in [docs/backup-and-restore.md](/C:/Users/sbelousov/Documents/Projects/DA_hackaton_chat/docs/backup-and-restore.md).

Server-side scripts:

- [ops/scripts/backup-prod.sh](/C:/Users/sbelousov/Documents/Projects/DA_hackaton_chat/ops/scripts/backup-prod.sh)
- [ops/scripts/restore-prod.sh](/C:/Users/sbelousov/Documents/Projects/DA_hackaton_chat/ops/scripts/restore-prod.sh)
- [ops/scripts/install-prod-backup-timer.sh](/C:/Users/sbelousov/Documents/Projects/DA_hackaton_chat/ops/scripts/install-prod-backup-timer.sh)
- [ops/systemd/chat-backup.service](/C:/Users/sbelousov/Documents/Projects/DA_hackaton_chat/ops/systemd/chat-backup.service)
- [ops/systemd/chat-backup.timer](/C:/Users/sbelousov/Documents/Projects/DA_hackaton_chat/ops/systemd/chat-backup.timer)

To enable daily automated backups on the server:

```bash
chmod +x ops/scripts/install-prod-backup-timer.sh
sudo ./ops/scripts/install-prod-backup-timer.sh /srv/chat
systemctl list-timers chat-backup.timer --no-pager
```

## Known Gaps

- Real SMTP is not configured yet.
- Backup automation assets are in repo but not yet enabled on the server.
- Monitoring and log aggregation are still manual.
- XMPP/Jabber thin slice is now running on `xmpp.memdecks.com:5222` with public STARTTLS and a valid Let's Encrypt cert, but client UX verification and federation testing are still pending.
