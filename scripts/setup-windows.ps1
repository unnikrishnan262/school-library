# School Library Management System - Setup Script
# For Windows 11
# Run as Administrator in PowerShell

#Requires -RunAsAdministrator

$ErrorActionPreference = "Stop"

# Helper to reload PATH from registry (replaces refreshenv in PowerShell)
function Update-Path {
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "School Library Management System - Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERROR: This script must be run as Administrator" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Install Chocolatey if not already installed
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host "[+] Installing Chocolatey package manager..." -ForegroundColor Green
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    Update-Path
} else {
    Write-Host "[OK] Chocolatey already installed" -ForegroundColor Green
}

# Install Node.js 22.x LTS (required by Prisma 7+)
Write-Host "[+] Installing Node.js 22.x LTS..." -ForegroundColor Green
choco install nodejs-lts -y --version=22.14.0 --allow-downgrade
Update-Path

Write-Host "Node version: $(node --version)" -ForegroundColor Cyan
Write-Host "npm version: $(npm --version)" -ForegroundColor Cyan

# Install PostgreSQL
Write-Host "[+] Installing PostgreSQL..." -ForegroundColor Green
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    choco install postgresql15 -y --params '/Password:postgres123'
    Update-Path

    # Wait for PostgreSQL service to start
    Start-Sleep -Seconds 10
    Start-Service postgresql-x64-15
} else {
    Write-Host "[OK] PostgreSQL already installed" -ForegroundColor Green
}

# Install Git (if not already installed)
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "[+] Installing Git..." -ForegroundColor Green
    choco install git -y
    Update-Path
}

# Install PM2 globally
Write-Host "[+] Installing PM2..." -ForegroundColor Green
npm install -g pm2
npm install -g pm2-windows-startup

# Setup PM2 to run as Windows service
Write-Host "[>] Configuring PM2 as Windows service..." -ForegroundColor Green
pm2-startup install

# Create application directory
$APP_DIR = "C:\school-library"
Write-Host "[+] Creating application directory at $APP_DIR..." -ForegroundColor Green
if (-not (Test-Path $APP_DIR)) {
    New-Item -ItemType Directory -Path $APP_DIR -Force | Out-Null
}

# Copy application files (project root is one level up from the scripts folder)
Write-Host "[+] Copying application files..." -ForegroundColor Green
$SOURCE_DIR = Split-Path -Parent $PSScriptRoot
$excludeDirs = @('node_modules', '.next', '.git', 'backups')

Get-ChildItem -Path $SOURCE_DIR -Exclude $excludeDirs | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $APP_DIR -Recurse -Force
}

Set-Location $APP_DIR

# Install Node.js dependencies
Write-Host "[+] Installing Node.js dependencies..." -ForegroundColor Green
npm install

# Setup PostgreSQL database
Write-Host "[DB] Setting up PostgreSQL database..." -ForegroundColor Green
$DB_NAME = "school_library"
$DB_USER = "school_library_user"
$DB_PASSWORD = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})

$env:PGPASSWORD = "postgres123"

# Create database and user (ignore errors if already exists)
$ErrorActionPreference = "Continue"
& psql -U postgres -c "CREATE DATABASE $DB_NAME;" 2>$null
if ($LASTEXITCODE -ne 0) { Write-Host "Database already exists, skipping." -ForegroundColor Yellow }

& psql -U postgres -c "CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';" 2>$null
if ($LASTEXITCODE -ne 0) { Write-Host "User already exists, skipping." -ForegroundColor Yellow }

& psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>$null
& psql -U postgres -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;" 2>$null
$ErrorActionPreference = "Stop"

# Create .env file (skip if already exists to preserve existing DB credentials)
if (-not (Test-Path "$APP_DIR\.env")) {
    Write-Host "[+] Creating .env file..." -ForegroundColor Green
    $NEXTAUTH_SECRET = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
    $envContent = @"
# Database
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="$NEXTAUTH_SECRET"
"@
    $envContent | Out-File -FilePath "$APP_DIR\.env" -Encoding UTF8
    Write-Host ""
    Write-Host "[OK] Database credentials saved to .env" -ForegroundColor Green
} else {
    Write-Host "[OK] .env already exists, skipping." -ForegroundColor Yellow
}
Write-Host "   Database: $DB_NAME" -ForegroundColor Cyan
Write-Host "   User: $DB_USER" -ForegroundColor Cyan
Write-Host "   Password: $DB_PASSWORD" -ForegroundColor Cyan
Write-Host ""

# Run Prisma migrations
Write-Host "[DB] Running database migrations..." -ForegroundColor Green
npx prisma generate
npx prisma migrate deploy
npm run db:seed

# Build Next.js application
Write-Host "[>] Building Next.js application..." -ForegroundColor Green
npm run build

# Create logs and backups directories
Write-Host "[+] Creating logs and backups directories..." -ForegroundColor Green
New-Item -ItemType Directory -Path "$APP_DIR\logs" -Force | Out-Null
New-Item -ItemType Directory -Path "$APP_DIR\backups" -Force | Out-Null

# Setup PM2
Write-Host "[>] Setting up PM2..." -ForegroundColor Green
$ErrorActionPreference = "Continue"
pm2 delete school-library 2>$null
$ErrorActionPreference = "Stop"
pm2 start ecosystem.config.js
pm2 save

# Setup daily backup task
Write-Host "[+] Setting up daily backup scheduled task..." -ForegroundColor Green
$backupScript = "$APP_DIR\scripts\backup-windows.ps1"

# Create scheduled task to run backup daily at 2:00 AM
$taskName = "SchoolLibraryBackup"
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File `"$backupScript`""
$trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Daily backup for School Library Management System" | Out-Null

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "[OK] Setup Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Application installed at: $APP_DIR" -ForegroundColor Cyan
Write-Host "Access the application at: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Default credentials:" -ForegroundColor Yellow
Write-Host "  Admin: admin@school.edu / admin123" -ForegroundColor White
Write-Host "  Librarian: librarian@school.edu / librarian123" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANT: Change default passwords after first login!" -ForegroundColor Red
Write-Host ""
Write-Host "PM2 commands:" -ForegroundColor Yellow
Write-Host "  pm2 status                     - Check application status" -ForegroundColor White
Write-Host "  pm2 logs                       - View application logs" -ForegroundColor White
Write-Host "  pm2 restart school-library     - Restart application" -ForegroundColor White
Write-Host "  pm2 stop school-library        - Stop application" -ForegroundColor White
Write-Host ""
Write-Host "Backup location: $APP_DIR\backups" -ForegroundColor Cyan
Write-Host "Daily backup scheduled at 2:00 AM" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start the application now, run:" -ForegroundColor Yellow
Write-Host "  pm2 status" -ForegroundColor White
Write-Host ""
