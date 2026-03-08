# School Library Management System - Backup Script
# For Windows 11
# This script creates a backup of the PostgreSQL database

$ErrorActionPreference = "Stop"

# Configuration
$APP_DIR = "C:\school-library"
$BACKUP_DIR = "$APP_DIR\backups"
$DB_NAME = "school_library"
$DB_USER = "school_library_user"
$TIMESTAMP = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$BACKUP_FILE = "$BACKUP_DIR\school_library_$TIMESTAMP.sql"
$LOG_FILE = "$APP_DIR\logs\backup.log"

# Function to write log
function Write-Log {
    param($Message)
    $logMessage = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - $Message"
    Write-Host $logMessage
    Add-Content -Path $LOG_FILE -Value $logMessage
}

# Create backup directory if it doesn't exist
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
}

# Create logs directory if it doesn't exist
if (-not (Test-Path "$APP_DIR\logs")) {
    New-Item -ItemType Directory -Path "$APP_DIR\logs" -Force | Out-Null
}

Write-Log "Starting database backup..."

# Read database password from .env file
$envFile = "$APP_DIR\.env"
if (Test-Path $envFile) {
    $dbUrl = (Get-Content $envFile | Select-String -Pattern "DATABASE_URL=").ToString()
    if ($dbUrl -match "postgresql://([^:]+):([^@]+)@") {
        $DB_PASSWORD = $matches[2]
    }
}

if (-not $DB_PASSWORD) {
    Write-Log "ERROR: Could not read database password from .env file"
    exit 1
}

# Set PostgreSQL password environment variable
$env:PGPASSWORD = $DB_PASSWORD

# Create backup
try {
    Write-Log "Creating backup: $BACKUP_FILE"
    & pg_dump -U $DB_USER -h localhost -d $DB_NAME -F p -f $BACKUP_FILE
    
    if ($LASTEXITCODE -eq 0) {
        $fileSize = (Get-Item $BACKUP_FILE).Length / 1KB
        Write-Log "Backup completed successfully. Size: $([math]::Round($fileSize, 2)) KB"
    } else {
        Write-Log "ERROR: Backup failed with exit code $LASTEXITCODE"
        exit 1
    }
} catch {
    Write-Log "ERROR: Backup failed - $_"
    exit 1
}

# Compress backup
try {
    Write-Log "Compressing backup..."
    $zipFile = "$BACKUP_FILE.zip"
    Compress-Archive -Path $BACKUP_FILE -DestinationPath $zipFile -Force
    Remove-Item $BACKUP_FILE
    
    $zipSize = (Get-Item $zipFile).Length / 1KB
    Write-Log "Backup compressed successfully. Size: $([math]::Round($zipSize, 2)) KB"
} catch {
    Write-Log "WARNING: Compression failed - $_"
}

# Delete backups older than 30 days
try {
    Write-Log "Cleaning up old backups (older than 30 days)..."
    $oldBackups = Get-ChildItem -Path $BACKUP_DIR -Filter "school_library_*.sql*" | 
                  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) }
    
    foreach ($backup in $oldBackups) {
        Remove-Item $backup.FullName -Force
        Write-Log "Deleted old backup: $($backup.Name)"
    }
    
    if ($oldBackups.Count -eq 0) {
        Write-Log "No old backups to delete"
    }
} catch {
    Write-Log "WARNING: Failed to clean up old backups - $_"
}

# Count total backups
$totalBackups = (Get-ChildItem -Path $BACKUP_DIR -Filter "school_library_*.sql*").Count
Write-Log "Total backups: $totalBackups"
Write-Log "Backup process completed"

# Clear password from environment
$env:PGPASSWORD = $null

