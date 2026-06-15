#!/usr/bin/env bash
# Nightly Postgres backup for the Yomi VPS stack.
#
# Dumps the database from the running compose `db` service to a timestamped,
# gzipped file and prunes dumps older than RETENTION_DAYS. Install as a cron:
#
#   # crontab -e  (runs 03:17 daily; randomized minute to avoid thundering herd)
#   17 3 * * * cd /opt/yomi && ./deploy/backup.sh >> /var/log/yomi-backup.log 2>&1
#
# For real durability, sync $BACKUP_DIR off-box afterwards (rclone/restic to S3,
# Backblaze B2, etc.) — a backup on the same disk does not survive disk loss.
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
ENV_FILE="${ENV_FILE:-$PROJECT_DIR/.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-$PROJECT_DIR/docker-compose.prod.yml}"

# shellcheck disable=SC1090
set -a; [ -f "$ENV_FILE" ] && . "$ENV_FILE"; set +a

mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$BACKUP_DIR/yomi-$STAMP.sql.gz"

echo "[$(date -u)] dumping ${POSTGRES_DB:-yomi} -> $OUT"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T db \
	pg_dump -U "${POSTGRES_USER:-yomi}" -d "${POSTGRES_DB:-yomi}" \
	| gzip -9 > "$OUT"

echo "[$(date -u)] pruning dumps older than ${RETENTION_DAYS}d"
find "$BACKUP_DIR" -name 'yomi-*.sql.gz' -mtime "+$RETENTION_DAYS" -delete

echo "[$(date -u)] done ($(du -h "$OUT" | cut -f1))"
