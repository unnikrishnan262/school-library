# School Library - Start App Script
# Checks if the app is running via PM2, starts it if not, then opens the browser.

$APP_DIR = "C:\school-library"
$APP_NAME = "school-library"
$APP_URL = "http://localhost:3000"

# Update PATH to ensure node/npm/pm2 are accessible
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Check if PostgreSQL service is running; start it if not
$pgService = Get-Service -Name "postgresql-x64-15" -ErrorAction SilentlyContinue
if ($pgService -and $pgService.Status -ne "Running") {
    Start-Service -Name "postgresql-x64-15"
    Start-Sleep -Seconds 5
}

# Check PM2 app status
$pm2Status = & pm2 jlist 2>$null | ConvertFrom-Json | Where-Object { $_.name -eq $APP_NAME }

if (-not $pm2Status -or $pm2Status.pm2_env.status -ne "online") {
    # App not running - start it
    Set-Location $APP_DIR
    & pm2 start ecosystem.config.js 2>$null
    & pm2 save 2>$null
    # Wait for app to come up
    Start-Sleep -Seconds 6
}

# Open browser
Start-Process $APP_URL
