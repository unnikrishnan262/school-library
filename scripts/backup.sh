#!/bin/bash

# School Library Management System - Automated Backup Script
# This script creates a PostgreSQL backup and optionally uploads it to cloud storage via rclone

set -e  # Exit on any error

# Configuration
APP_DIR="/opt/school-library"
BACKUP_DIR="$APP_DIR/backups"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="backup_${TIMESTAMP}.sql"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILE"
LOG_FILE="$APP_DIR/logs/backup.log"

# Retention policy (days)
RETENTION_DAYS=30

# Load environment variables
if [ -f "$APP_DIR/.env" ]; then
    export $(grep -v '^#' "$APP_DIR/.env" | xargs)
else
    echo "ERROR: .env file not found at $APP_DIR/.env" | tee -a "$LOG_FILE"
    exit 1
fi

# Parse DATABASE_URL
DB_URL="$DATABASE_URL"
if [ -z "$DB_URL" ]; then
    echo "ERROR: DATABASE_URL not set in .env" | tee -a "$LOG_FILE"
    exit 1
fi

# Extract database connection details from URL
# Format: postgresql://user:password@host:port/database
DB_HOST=$(echo "$DB_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo "$DB_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo "$DB_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo "$DB_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASSWORD=$(echo "$DB_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=========================================="
log "Starting backup process"
log "=========================================="

# Create database backup
log "Creating PostgreSQL backup..."
export PGPASSWORD="$DB_PASSWORD"

if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F p -f "$BACKUP_PATH"; then
    log "✅ Backup created successfully: $BACKUP_FILE"

    # Get backup file size
    BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
    log "   Size: $BACKUP_SIZE"
else
    log "❌ ERROR: Backup failed!"
    exit 1
fi

unset PGPASSWORD

# Compress backup
log "Compressing backup..."
gzip "$BACKUP_PATH"
BACKUP_PATH="${BACKUP_PATH}.gz"
BACKUP_FILE="${BACKUP_FILE}.gz"
COMPRESSED_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
log "✅ Backup compressed: $BACKUP_FILE (${COMPRESSED_SIZE})"

# Upload to cloud storage (optional - requires rclone configuration)
if command -v rclone &> /dev/null; then
    # Check if rclone remote is configured
    # To configure: rclone config
    # Example remote name: "gdrive" for Google Drive, "s3" for AWS S3, etc.

    RCLONE_REMOTE="gdrive"  # Change this to your configured remote name
    RCLONE_PATH="school-library-backups"  # Remote folder path

    if rclone listremotes | grep -q "^${RCLONE_REMOTE}:"; then
        log "Uploading to cloud storage ($RCLONE_REMOTE)..."

        if rclone copy "$BACKUP_PATH" "${RCLONE_REMOTE}:${RCLONE_PATH}" --progress; then
            log "✅ Backup uploaded to cloud storage"
        else
            log "⚠️  WARNING: Cloud upload failed (backup still available locally)"
        fi
    else
        log "ℹ️  rclone remote '$RCLONE_REMOTE' not configured. Skipping cloud upload."
        log "   To configure: rclone config"
    fi
else
    log "ℹ️  rclone not installed. Skipping cloud upload."
    log "   To install: curl https://rclone.org/install.sh | sudo bash"
fi

# Clean up old backups (older than RETENTION_DAYS)
log "Cleaning up old backups (older than $RETENTION_DAYS days)..."
DELETED_COUNT=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete -print | wc -l)
if [ "$DELETED_COUNT" -gt 0 ]; then
    log "✅ Deleted $DELETED_COUNT old backup(s)"
else
    log "ℹ️  No old backups to delete"
fi

# Count total backups
TOTAL_BACKUPS=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f | wc -l)
log "📊 Total backups: $TOTAL_BACKUPS"

log "=========================================="
log "Backup process completed"
log "=========================================="
log ""
