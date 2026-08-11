#!/bin/bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
PROJECT_DIR=$(cd -- "$SCRIPT_DIR/.." && pwd)
BACKUP_DIR=${BACKUP_DIR:-"$PROJECT_DIR/backups"}
CONTAINER_NAME=${DB_CONTAINER_NAME:-warehouse-db}
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

mkdir -p "$BACKUP_DIR"

if ! docker inspect "$CONTAINER_NAME" >/dev/null 2>&1; then
  echo "[$(date)] Backup failed: container $CONTAINER_NAME does not exist." >&2
  exit 1
fi

DB_NAME=$(docker exec "$CONTAINER_NAME" sh -c 'printf "%s" "$POSTGRES_DB"')
if [ -z "$DB_NAME" ]; then
  echo "[$(date)] Backup failed: POSTGRES_DB is empty in $CONTAINER_NAME." >&2
  exit 1
fi

BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"
echo "[$(date)] Starting database backup..."

docker exec "$CONTAINER_NAME" sh -c 'exec pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  | gzip -c > "$BACKUP_FILE"
gzip -t "$BACKUP_FILE"

FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Backup successful: $BACKUP_FILE ($FILESIZE)"

find "$BACKUP_DIR" -name "*.sql.gz" -type f -mtime "+$RETENTION_DAYS" -delete
REMAINING=$(find "$BACKUP_DIR" -maxdepth 1 -name "*.sql.gz" -type f | wc -l | tr -d ' ')
echo "[$(date)] Done. $REMAINING backup(s) remaining."
