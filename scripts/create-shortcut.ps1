# Run this once (as Administrator) to create the desktop shortcut.

$scriptPath = "C:\school-library\scripts\start-app.ps1"
$shortcutPath = [Environment]::GetFolderPath("CommonDesktopDirectory") + "\School Library.lnk"

# Use a book/library icon from Windows shell32
$iconPath = "C:\Windows\System32\shell32.dll"
$iconIndex = 23  # Books/documents icon in shell32.dll

$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "powershell.exe"
$shortcut.Arguments = "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`""
$shortcut.WorkingDirectory = "C:\school-library"
$shortcut.Description = "Open School Library Management System"
$shortcut.IconLocation = "$iconPath,$iconIndex"
$shortcut.Save()

Write-Host "Desktop shortcut created: $shortcutPath"
Write-Host "Double-click 'School Library' on the desktop to launch the app."
