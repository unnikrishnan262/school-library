# School Library Management System

A comprehensive, full-stack library management application built with **Next.js 16**, **PostgreSQL**, **Prisma 7**, and **NextAuth.js**. Designed for small schools (<500 students) with local server deployment on Ubuntu/Debian systems.

## Features

### 📚 Book & Resource Management
- Complete book catalog with ISBN, categories, and metadata
- Multi-copy management with unique accession numbers and barcodes
- USB barcode scanner support (HID keyboard input)
- Advanced search and filtering
- Stock verification reports

### 👥 Member Management
- Student and staff profiles with role-based access
- Academic year management
- Bulk student promotion to next year/class
- Borrowing history tracking

### 🔄 Circulation System
- Book issue/return with barcode scanning
- Configurable borrowing limits and durations
- Automatic due date calculation
- Book renewal system (with limits)
- Overdue fine calculation and collection
- Book reservation system

### 📊 Reports & Analytics
- Issue/Return summary (daily/monthly/yearly)
- Overdue books and pending fines
- Most issued books (popularity trends)
- Stock verification with status breakdown
- Print/PDF export for all reports

### ⚙️ Administration
- Configurable fine rules and borrowing limits
- Audit log viewer (track all system changes)
- Database backup and restore
- Role-based access control (Admin, Librarian, Teacher, Student)
- School information settings

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React, Tailwind CSS v4
- **Backend**: Next.js API Routes, NextAuth.js v4
- **Database**: PostgreSQL + Prisma 7
- **Authentication**: NextAuth.js with JWT sessions
- **UI Components**: Custom components with Radix UI primitives
- **Deployment**: PM2 + Nginx on Ubuntu/Debian

## Prerequisites

### For Development
- Node.js 20.x LTS or higher
- PostgreSQL 14+ or Docker
- npm or yarn

### For Production Deployment
- Ubuntu 20.04+ or Debian 11+ server
- Node.js 20.x LTS
- PostgreSQL 14+
- Nginx
- PM2 (installed via npm)
- Sudo privileges

## Quick Start (Development)

### 1. Clone and Install

```bash
git clone <repository-url>
cd school-library
npm install
```

### 2. Setup PostgreSQL

#### Using Docker (Recommended for Development)
```bash
docker run --name school-library-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=school_library \
  -p 5432:5432 \
  -d postgres:16
```

#### Using Local PostgreSQL
```bash
sudo -u postgres psql
CREATE DATABASE school_library;
\q
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/school_library"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-generate-with-openssl-rand-base64-32"
```

### 4. Run Migrations and Seed

```bash
npm run db:migrate
npm run db:seed
```

### 5. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### Default Credentials

After seeding:
- **Admin**: `admin@school.edu` / `admin123`
- **Librarian**: `librarian@school.edu` / `librarian123`

⚠️ **Change these passwords immediately in production!**

## Production Deployment

### Automated Setup (Recommended)

Run the automated setup script on a fresh Ubuntu/Debian server:

```bash
# Clone the repository
git clone <repository-url>
cd school-library

# Make setup script executable
chmod +x scripts/setup.sh

# Run setup (will prompt for server domain/IP)
./scripts/setup.sh
```

The script will:
1. Install Node.js, PostgreSQL, Nginx, PM2
2. Create database and user
3. Generate secure credentials
4. Run migrations and seed data
5. Build the application
6. Configure PM2 for auto-restart
7. Setup Nginx reverse proxy
8. Schedule daily backups

### Manual Setup

#### 1. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx
sudo apt install -y nginx

# Install PM2 globally
sudo npm install -g pm2
```

#### 2. Setup Database

```bash
sudo -u postgres psql
CREATE DATABASE school_library;
CREATE USER school_library_user WITH ENCRYPTED PASSWORD 'your-strong-password';
GRANT ALL PRIVILEGES ON DATABASE school_library TO school_library_user;
\q
```

#### 3. Deploy Application

```bash
# Create application directory
sudo mkdir -p /opt/school-library
sudo chown $USER:$USER /opt/school-library

# Copy application files
rsync -av --exclude='node_modules' --exclude='.next' \
  /path/to/local/repo/ /opt/school-library/

cd /opt/school-library

# Install dependencies
npm install

# Create .env file
nano .env
# (Add DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET)

# Run migrations and seed
npx prisma migrate deploy
npx prisma db seed

# Build application
npm run build
```

#### 4. Configure PM2

```bash
# Start application
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup systemd
# Run the command PM2 outputs
```

#### 5. Configure Nginx

```bash
# Copy nginx config
sudo cp nginx.conf.example /etc/nginx/sites-available/school-library

# Edit server_name
sudo nano /etc/nginx/sites-available/school-library
# Change "your-server-name-or-ip" to your domain or IP

# Enable site
sudo ln -s /etc/nginx/sites-available/school-library /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

#### 6. Setup Automated Backups

```bash
# Make backup script executable
chmod +x /opt/school-library/scripts/backup.sh

# Add to crontab (runs daily at 2:00 AM)
crontab -e
# Add line:
# 0 2 * * * /opt/school-library/scripts/backup.sh
```

## Database Management

### Available Commands

```bash
# Run migrations (development)
npm run db:migrate

# Run migrations (production)
npx prisma migrate deploy

# Seed database
npm run db:seed

# Open Prisma Studio (database GUI)
npm run db:studio

# Reset database (⚠️ DELETES ALL DATA)
npm run db:reset
```

### Backup and Restore

#### Via Web UI
1. Login as Admin
2. Navigate to **Settings → Backup & Restore**
3. Click **Create Backup** to generate a backup file
4. Click **Download** to save the backup locally
5. Click **Restore** to restore from a backup (⚠️ replaces all data)

#### Via Command Line

**Create Backup:**
```bash
cd /opt/school-library
./scripts/backup.sh
```

**Restore Backup:**
```bash
# Decompress backup
gunzip backups/backup_2024-01-15_02-00-00.sql.gz

# Restore
psql -U school_library_user -d school_library \
  -f backups/backup_2024-01-15_02-00-00.sql
```

### Cloud Backup Setup (Optional)

Install and configure rclone for automated cloud backups:

```bash
# Install rclone
curl https://rclone.org/install.sh | sudo bash

# Configure remote
rclone config
# Follow prompts to configure Google Drive, AWS S3, Dropbox, etc.

# Edit backup script to enable cloud uploads
nano /opt/school-library/scripts/backup.sh
# Change RCLONE_REMOTE to your configured remote name
```

## System Management

### PM2 Commands

```bash
# Check application status
pm2 status

# View logs
pm2 logs school-library

# View error logs only
pm2 logs school-library --err

# Restart application
pm2 restart school-library

# Stop application
pm2 stop school-library

# Start application
pm2 start school-library

# Monitor resources
pm2 monit
```

### Nginx Commands

```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# View error logs
sudo tail -f /var/log/nginx/school-library-error.log

# View access logs
sudo tail -f /var/log/nginx/school-library-access.log
```

### PostgreSQL Commands

```bash
# Access database
sudo -u postgres psql -d school_library

# View database size
sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('school_library'));"

# Vacuum database (optimize)
sudo -u postgres psql -d school_library -c "VACUUM ANALYZE;"
```

## Configuration

### Application Settings

Login as Admin and navigate to **Settings → General Settings** to configure:

- **School Name**: Displayed on reports
- **Fine Per Day**: Daily fine amount in ₹
- **Grace Period**: Days before fines start
- **Max Fine Per Book**: Fine cap per book
- **Borrow Duration**: Days (separate for students/teachers)
- **Max Books**: Borrowing limit (separate for students/teachers)
- **Max Renewals**: Maximum renewal count
- **Reservation Expiry**: Days before reservation expires

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/dbname` |
| `NEXTAUTH_URL` | Application URL | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | JWT signing secret (32+ characters) | Generate with `openssl rand -base64 32` |

## Barcode Scanner Setup

The system supports USB HID barcode scanners (no special drivers needed).

### Scanner Configuration

1. Configure your scanner to send **Enter key** after each scan
2. Most scanners default to this setting (keyboard wedge mode)
3. Test by scanning a barcode into a text editor

### Usage in Application

1. Navigate to **Circulation → Issue Book** or **Return Book**
2. Click/focus on the barcode input field
3. Scan the book barcode
4. Scanner will auto-submit the form

Supported barcode formats: Any format that your scanner supports (typically Code 39, Code 128, EAN-13)

## Troubleshooting

### Application won't start

```bash
# Check PM2 logs
pm2 logs school-library --lines 100

# Check database connection
psql -U school_library_user -d school_library -c "SELECT 1;"
```

### Database connection errors

```bash
# Verify DATABASE_URL in .env
cat /opt/school-library/.env | grep DATABASE_URL

# Check PostgreSQL is running
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### Nginx 502 Bad Gateway

```bash
# Check if application is running
pm2 status

# Check if port 3000 is listening
sudo netstat -tlnp | grep 3000

# Restart application
pm2 restart school-library
```

### Permission denied errors

```bash
# Fix ownership
sudo chown -R $USER:$USER /opt/school-library

# Fix backup directory permissions
chmod +x /opt/school-library/scripts/backup.sh
```

## Security Considerations

1. **Change default passwords** immediately after first login
2. **Use strong NEXTAUTH_SECRET** (generate with `openssl rand -base64 32`)
3. **Configure firewall** to allow only ports 22 (SSH), 80 (HTTP), 443 (HTTPS)
4. **Enable HTTPS** using Let's Encrypt (see nginx.conf.example SSL section)
5. **Regular backups** - verify daily backup cron job is running
6. **Update system packages** regularly with `sudo apt update && sudo apt upgrade`
7. **Restrict PostgreSQL** access to localhost only
8. **Monitor logs** regularly for suspicious activity

## Project Structure

```
school-library/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── seed.ts                # Initial data seeder
│   └── prisma.config.ts       # Prisma CLI configuration
├── src/
│   ├── app/
│   │   ├── (auth)/login/      # Authentication pages
│   │   ├── (dashboard)/       # Protected dashboard routes
│   │   └── api/               # API endpoints
│   ├── components/
│   │   ├── ui/                # Reusable UI components
│   │   ├── layout/            # Layout components
│   │   ├── books/             # Book management components
│   │   ├── members/           # Member management components
│   │   ├── circulation/       # Circulation components
│   │   ├── reports/           # Report components
│   │   └── settings/          # Admin components
│   └── lib/
│       ├── auth.ts            # NextAuth configuration
│       ├── prisma.ts          # Prisma client
│       ├── utils.ts           # Utility functions
│       └── fine-calculator.ts # Fine calculation logic
├── scripts/
│   ├── setup.sh               # Production setup script
│   └── backup.sh              # Automated backup script
├── ecosystem.config.js        # PM2 configuration
├── nginx.conf.example         # Nginx configuration template
└── README.md                  # This file
```

## License

[Specify your license here]

## Support

For issues, questions, or contributions, please [open an issue](https://github.com/your-repo/issues) or contact your system administrator.

---

Built with ❤️ using Next.js, PostgreSQL, and Prisma
