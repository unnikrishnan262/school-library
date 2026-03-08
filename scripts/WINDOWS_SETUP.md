# Windows 11 Setup Guide

This guide will help you set up the School Library Management System on Windows 11.

## Prerequisites

- Windows 11 (64-bit)
- Administrator access
- Internet connection

## Quick Setup (Automated)

### Step 1: Open PowerShell as Administrator

1. Press `Win + X`
2. Select **"Windows PowerShell (Admin)"** or **"Terminal (Admin)"**
3. If prompted by User Account Control, click **"Yes"**

### Step 2: Enable Script Execution

Run this command to allow PowerShell scripts to execute:

```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
```

### Step 3: Navigate to Project Directory

```powershell
cd C:\path\to\school-library
```

### Step 4: Run Setup Script

```powershell
.\scripts\setup-windows.ps1
```

The script will automatically:
- ✅ Install Chocolatey package manager
- ✅ Install Node.js 20.x LTS
- ✅ Install PostgreSQL 15
- ✅ Install Git
- ✅ Install PM2 process manager
- ✅ Create application directory at `C:\school-library`
- ✅ Copy application files
- ✅ Install Node.js dependencies
- ✅ Create PostgreSQL database and user
- ✅ Generate secure credentials
- ✅ Run database migrations and seed data
- ✅ Build Next.js application
- ✅ Configure PM2 to run as Windows service
- ✅ Schedule daily backups at 2:00 AM

### Step 5: Access the Application

Once setup is complete, open your browser and navigate to:

```
http://localhost:3000
```

## Default Credentials

**Admin Account:**
- Email: `admin@school.edu`
- Password: `admin123`

**Librarian Account:**
- Email: `librarian@school.edu`
- Password: `librarian123`

⚠️ **IMPORTANT:** Change these default passwords immediately after first login!

## Managing the Application

### PM2 Commands

Check application status:
```powershell
pm2 status
```

View application logs:
```powershell
pm2 logs school-library
```

Restart application:
```powershell
pm2 restart school-library
```

Stop application:
```powershell
pm2 stop school-library
```

Start application:
```powershell
pm2 start school-library
```

### Manual Backup

To create a manual backup:

```powershell
.\scripts\backup-windows.ps1
```

Backups are stored in: `C:\school-library\backups`

### View Scheduled Backup Task

```powershell
Get-ScheduledTask -TaskName "SchoolLibraryBackup"
```

## Troubleshooting

### PostgreSQL Service Not Running

Start the PostgreSQL service:

```powershell
Start-Service postgresql-x64-15
```

### PM2 Not Starting on Boot

Reinstall PM2 startup:

```powershell
pm2-startup install
pm2 save
```

### Port 3000 Already in Use

Check what's using port 3000:

```powershell
netstat -ano | findstr :3000
```

Kill the process (replace PID with actual process ID):

```powershell
taskkill /PID <PID> /F
```

### Database Connection Issues

1. Check PostgreSQL service is running:
   ```powershell
   Get-Service postgresql-x64-15
   ```

2. Verify `.env` file exists at `C:\school-library\.env`

3. Test database connection:
   ```powershell
   psql -U school_library_user -d school_library -h localhost
   ```

### Application Not Building

Clear cache and rebuild:

```powershell
cd C:\school-library
Remove-Item -Recurse -Force .next, node_modules
npm install
npm run build
```

## Uninstall

To completely remove the application:

1. Stop and delete PM2 process:
   ```powershell
   pm2 delete school-library
   pm2 save
   ```

2. Remove scheduled backup task:
   ```powershell
   Unregister-ScheduledTask -TaskName "SchoolLibraryBackup" -Confirm:$false
   ```

3. Drop database (optional):
   ```powershell
   psql -U postgres -c "DROP DATABASE school_library;"
   psql -U postgres -c "DROP USER school_library_user;"
   ```

4. Delete application directory:
   ```powershell
   Remove-Item -Recurse -Force C:\school-library
   ```

## Additional Configuration

### Changing the Port

Edit `ecosystem.config.js` and change the `PORT` value:

```javascript
env: {
  NODE_ENV: 'production',
  PORT: 8080,  // Change this
}
```

Then restart PM2:

```powershell
pm2 restart school-library
```

### Enabling HTTPS

For production use, consider setting up HTTPS using:
- IIS with reverse proxy
- Caddy server
- nginx for Windows

## Support

For issues and questions, please refer to the main README.md file or create an issue on the project repository.

