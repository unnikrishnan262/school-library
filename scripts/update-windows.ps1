# School Library Management System - Update Script
# For Windows 11
# Run as Administrator in PowerShell from the development project root:
#   cd C:\Users\DELL\school-library
#   .\scripts\update-windows.ps1

#Requires -RunAsAdministrator

$ErrorActionPreference = "Stop"

$APP_NAME  = "school-library"
$APP_DIR   = "C:\school-library"
$LOG_FILE  = "$APP_DIR\logs\update.log"

# Reload PATH so node/npm/pm2 are accessible
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
            [System.Environment]::GetEnvironmentVariable("Path","User")

function Write-Log {
    param($Message, $Color = "White")
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - $Message"
    Write-Host $line -ForegroundColor $Color
    if (Test-Path (Split-Path $LOG_FILE)) {
        Add-Content -Path $LOG_FILE -Value $line
    }
}

function Exit-WithError {
    param($Message)
    Write-Log "ERROR: $Message" "Red"
    Write-Log "Update aborted. The running application has NOT been restarted." "Yellow"
    exit 1
}

# ── Validate source directory ────────────────────────────────────────────────
$SOURCE_DIR = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path "$SOURCE_DIR\package.json")) {
    Exit-WithError "package.json not found in $SOURCE_DIR. Run this script from the project root."
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " School Library - Update" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Source : $SOURCE_DIR" -ForegroundColor Cyan
Write-Host "Target : $APP_DIR"    -ForegroundColor Cyan
Write-Host ""

# ── Ensure logs directory exists ─────────────────────────────────────────────
New-Item -ItemType Directory -Path "$APP_DIR\logs" -Force | Out-Null

# ── Step 1: Sync files ───────────────────────────────────────────────────────
Write-Log "[1/5] Syncing files to $APP_DIR ..." "Green"

$excludeDirs = @('node_modules', '.next', '.git', 'backups', 'logs')

Get-ChildItem -Path $SOURCE_DIR | Where-Object { $excludeDirs -notcontains $_.Name } | ForEach-Object {
    $dest = Join-Path $APP_DIR $_.Name
    if ($_.PSIsContainer) {
        # Robocopy for directories: mirror content, exclude transient dirs
        $excludeArgs = $excludeDirs | ForEach-Object { "/XD $_" }
        $robocopyArgs = @($_.FullName, $dest, '/E', '/NFL', '/NDL', '/NJH', '/NJS') + $excludeArgs
        & robocopy @robocopyArgs | Out-Null
    } else {
        Copy-Item -Path $_.FullName -Destination $dest -Force
    }
}

Write-Log "[1/5] File sync complete." "Green"

# ── Step 2: Install dependencies ─────────────────────────────────────────────
Write-Log "[2/5] Installing dependencies..." "Green"
Set-Location $APP_DIR

& npm install --prefer-offline 2>&1 | Tee-Object -Variable npmOut | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host ($npmOut -join "`n")
    Exit-WithError "npm install failed."
}
Write-Log "[2/5] Dependencies installed." "Green"

# ── Step 3: Apply database migrations ────────────────────────────────────────
Write-Log "[3/5] Applying database migrations..." "Green"

# Prisma writes informational messages to stderr even on success, which trips
# ErrorActionPreference=Stop. Relax it just for these calls and rely on $LASTEXITCODE.
$ErrorActionPreference = "Continue"

& npx prisma generate 2>&1 | Out-Null
$prismaGenerateExit = $LASTEXITCODE

& npx prisma migrate deploy 2>&1 | Tee-Object -Variable migrateOut
$prismaDeployExit = $LASTEXITCODE

$ErrorActionPreference = "Stop"

if ($prismaGenerateExit -ne 0) { Exit-WithError "prisma generate failed." }
if ($prismaDeployExit -ne 0) {
    Write-Host ($migrateOut -join "`n")
    Exit-WithError "prisma migrate deploy failed."
}
Write-Log "[3/5] Migrations applied." "Green"

# ── Step 4: Build application ─────────────────────────────────────────────────
Write-Log "[4/5] Building application..." "Green"

& npm run build 2>&1 | Tee-Object -Variable buildOut
if ($LASTEXITCODE -ne 0) {
    Write-Host ($buildOut -join "`n")
    Exit-WithError "Build failed. The running application has NOT been restarted."
}
Write-Log "[4/5] Build complete." "Green"

# ── Step 5: Reload PM2 (zero-downtime) ───────────────────────────────────────
Write-Log "[5/5] Reloading PM2 process..." "Green"

$pm2List = & pm2 jlist 2>$null | ConvertFrom-Json
$isRunning = $pm2List | Where-Object { $_.name -eq $APP_NAME -and $_.pm2_env.status -eq "online" }

if ($isRunning) {
    & pm2 reload $APP_NAME 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Exit-WithError "pm2 reload failed." }
    Write-Log "[5/5] Application reloaded (zero-downtime)." "Green"
} else {
    & pm2 start ecosystem.config.js 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Exit-WithError "pm2 start failed." }
    Write-Log "[5/5] Application started (was not running)." "Yellow"
}

& pm2 save 2>&1 | Out-Null

# ── Summary ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Update Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Application: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Yellow
Write-Host "  pm2 status                    - Check application status" -ForegroundColor White
Write-Host "  pm2 logs $APP_NAME            - View live logs" -ForegroundColor White
Write-Host "  pm2 logs $APP_NAME --err      - View error logs" -ForegroundColor White
Write-Host ""
