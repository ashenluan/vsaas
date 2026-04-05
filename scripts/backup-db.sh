#!/bin/bash
# Database backup script for vsaas
# Usage: ./scripts/backup-db.sh
# Cron: 0 3 * * * /path/to/vsaas/scripts/backup-db.sh >> /var/log/vsaas-backup.log 2>&1

set -euo pipefail

# Configuration
BACKUP_DIR="/backups/vsaas"
RETENTION_DAYS=14
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/vsaas_$DATE.sql.gz"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Get database credentials from docker container environment
DB_USER=${DB_USER:-vsaas}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME:-vsaas}
DB_CONTAINER=${DB_CONTAINER:-vsaas-postgres}

echo "[$(date)] Starting database backup..."

# Dump database via docker exec
docker exec "$DB_CONTAINER" pg_dump \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-privileges \
  --format=plain \
  | gzip > "$BACKUP_FILE"

# Verify backup
if [ -s "$BACKUP_FILE" ]; then
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "[$(date)] Backup completed: $BACKUP_FILE ($SIZE)"
else
  echo "[$(date)] ERROR: Backup file is empty!"
  rm -f "$BACKUP_FILE"
  exit 1
fi

# Cleanup old backups
echo "[$(date)] Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "vsaas_*.sql.gz" -mtime +$RETENTION_DAYS -delete

REMAINING=$(ls -1 "$BACKUP_DIR"/vsaas_*.sql.gz 2>/dev/null | wc -l)
echo "[$(date)] Backup complete. $REMAINING backups retained."
