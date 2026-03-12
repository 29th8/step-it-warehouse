#!/bin/bash
# =============================================
# Database Backup Script
# =============================================
# Usage: bash /opt/apps/warehouse-system/scripts/backup.sh
# Crontab: 0 2 * * * /opt/apps/warehouse-system/scripts/backup.sh
# =============================================

set -e

# ------ CONFIG ------
BACKUP_DIR="/opt/apps/warehouse-system/backups"
CONTAINER_NAME="warehouse-db"
DB_USER="${DB_USER:-admin}"
DB_NAME="${DB_NAME:-warehouse_db}"
RETENTION_DAYS=7
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

# ------ CREATE DIR ------
mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting database backup..."

# ------ DUMP & COMPRESS ------
docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "[$(date)] Backup SUCCESS: $BACKUP_FILE ($FILESIZE)"
else
    echo "[$(date)] Backup FAILED!" >&2
    exit 1
fi

# ------ CLEANUP OLD BACKUPS ------
echo "[$(date)] Cleaning backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete

REMAINING=$(ls -1 "$BACKUP_DIR"/*.sql.gz 2>/dev/null | wc -l)
echo "[$(date)] Done. $REMAINING backup(s) remaining."
