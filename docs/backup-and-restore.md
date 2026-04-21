# Backup And Restore

This repo now includes basic production backup and restore scripts for the current Docker Compose deployment.

Scripts:

- [ops/scripts/backup-prod.sh](/C:/Users/sbelousov/Documents/Projects/DA_hackaton_chat/ops/scripts/backup-prod.sh)
- [ops/scripts/restore-prod.sh](/C:/Users/sbelousov/Documents/Projects/DA_hackaton_chat/ops/scripts/restore-prod.sh)

Both scripts assume:

- the production repo checkout lives on the server
- you run them from that checkout
- `.env.production` exists
- `docker compose -f docker-compose.prod.yml` is the active runtime

## What Gets Backed Up

`backup-prod.sh` captures:

- PostgreSQL dump as `postgres.sql`
- uploaded files as `uploads.tar.gz`
- `git rev-parse HEAD`
- `docker compose ps`
- checksums for the backup payloads

Backups are written under `backups/<UTC timestamp>/` by default.

You can override the target root directory with:

```bash
BACKUP_DIR=/srv/chat-backups ./ops/scripts/backup-prod.sh
```

## Backup Usage

From the production checkout:

```bash
chmod +x ops/scripts/backup-prod.sh
./ops/scripts/backup-prod.sh
```

Recommended next step:

- run it manually once
- copy the resulting backup directory off the droplet
- then wire it into cron or a systemd timer

## Restore Usage

Restore is destructive and intentionally guarded.

From the production checkout:

```bash
chmod +x ops/scripts/restore-prod.sh
CONFIRM_RESTORE=YES ./ops/scripts/restore-prod.sh backups/20260421T213500Z
```

The restore flow:

1. stops the app container
2. restores the database from `postgres.sql`
3. replaces `/app/uploads` from `uploads.tar.gz`
4. starts the app container again

## Safety Notes

- Test restore on a non-production copy before trusting it.
- Keep at least one recent backup off the droplet.
- Do not run restore while users are actively writing data unless you accept data loss after the backup point.
- If you change compose service names or runtime paths, update these scripts too.
