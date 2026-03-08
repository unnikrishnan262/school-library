$src = 'C:\Users\DELL\school-library'
$dst = 'C:\school-library'

$files = @(
  'src\app\api\settings\classes-sections\route.ts',
  'src\components\settings\classes-sections-manager.tsx',
  'src\app\(dashboard)\settings\classes-sections\page.tsx',
  'src\app\(dashboard)\settings\page.tsx',
  'src\components\members\student-form.tsx',
  'src\components\members\academic-years-manager.tsx',
  'src\components\settings\audit-log-viewer.tsx',
  'src\app\api\backup\create\route.ts',
  'src\app\api\backup\restore\route.ts',
  'package.json',
  'tsconfig.seed.json'
)

foreach ($f in $files) {
  $srcPath = Join-Path $src $f
  $dstPath = Join-Path $dst $f
  $dstDir = Split-Path $dstPath -Parent
  if (-not (Test-Path $dstDir)) { New-Item -ItemType Directory -Path $dstDir -Force | Out-Null }
  Copy-Item -Path $srcPath -Destination $dstPath -Force
  Write-Host "Copied: $f"
}

Write-Host ""
Write-Host "Sync complete. Now rebuilding..."
Set-Location $dst
npm run build
pm2 restart school-library
Write-Host "Done. App restarted."
