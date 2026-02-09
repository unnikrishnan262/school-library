#!/bin/bash

# School Library Management System - macOS Setup Script
# For macOS 12 (Monterey) and later
# Run as regular user (NOT with sudo)

set -e  # Exit on any error

echo "=========================================="
echo "School Library Management System - macOS Setup"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "ERROR: Do not run this script with sudo. Run as a regular user."
    exit 1
fi

# Check for Homebrew
if ! command -v brew &> /dev/null; then
    echo "📦 Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

    # Add Homebrew to PATH for Apple Silicon Macs
    if [[ $(uname -m) == 'arm64' ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
else
    echo "✅ Homebrew already installed"
fi

# Update Homebrew
echo "📦 Updating Homebrew..."
brew update

# Install required packages
echo "📦 Installing required packages..."
brew install node@20 postgresql@16 nginx

# Add Node.js and PostgreSQL to PATH
echo 'export PATH="/opt/homebrew/opt/node@20/bin:$PATH"' >> ~/.zshrc
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"

echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"

# Install PM2 globally
echo "📦 Installing PM2..."
npm install -g pm2

# Start PostgreSQL service
echo "🗄️  Starting PostgreSQL..."
brew services start postgresql@16

# Wait for PostgreSQL to start
echo "Waiting for PostgreSQL to start..."
sleep 5

# Create application directory in user's home
APP_DIR="$HOME/school-library"
echo "📁 Creating application directory at $APP_DIR..."
mkdir -p $APP_DIR

# Copy application files (assumes script is run from project root)
echo "📁 Copying application files..."
rsync -av --exclude='node_modules' --exclude='.next' --exclude='.git' --exclude='backups' \
    . $APP_DIR/

cd $APP_DIR

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Setup PostgreSQL
echo "🗄️  Setting up PostgreSQL..."
DB_NAME="school_library"
DB_USER="school_library_user"
DB_PASSWORD=$(openssl rand -base64 32)

# Use full path to psql (connect to template1 which always exists)
PSQL="/opt/homebrew/opt/postgresql@16/bin/psql"

# Create database and user (using template1 database which always exists)
$PSQL -d template1 -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "Database already exists"
$PSQL -d template1 -c "CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';" 2>/dev/null || echo "User already exists"
$PSQL -d template1 -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
$PSQL -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;"
$PSQL -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO PUBLIC;"

# Create .env file
echo "📝 Creating .env file..."
cat > $APP_DIR/.env << EOF
# Database
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
EOF

echo ""
echo "✅ Database credentials saved to .env"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo "   Password: $DB_PASSWORD"
echo ""

# Generate Prisma Client
echo "🗄️  Generating Prisma Client..."
npx prisma generate

# Run Prisma migrations
echo "🗄️  Running database migrations..."
npx prisma migrate deploy
npx prisma db seed

# Build Next.js application
echo "🔨 Building Next.js application..."
npm run build

# Create logs and backups directories
mkdir -p $APP_DIR/logs
mkdir -p $APP_DIR/backups

# Setup PM2
echo "🚀 Setting up PM2..."
pm2 delete school-library 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

# Setup PM2 startup script for macOS
echo "🚀 Configuring PM2 to start on login..."
pm2 startup launchd
echo ""
echo "⚠️  IMPORTANT: Run the command PM2 just displayed above if this is your first time."
echo ""

# Configure Nginx
echo "🌐 Configuring Nginx..."

# Create nginx sites directory if it doesn't exist
mkdir -p /opt/homebrew/etc/nginx/sites-available
mkdir -p /opt/homebrew/etc/nginx/sites-enabled

# Copy nginx config
cp nginx.conf.example /opt/homebrew/etc/nginx/sites-available/school-library

# Update server_name in nginx config
read -p "Enter your server domain or IP (default: localhost): " SERVER_NAME
SERVER_NAME=${SERVER_NAME:-localhost}
sed -i '' "s/your-server-name-or-ip/$SERVER_NAME/g" /opt/homebrew/etc/nginx/sites-available/school-library

# Update nginx.conf to include sites-enabled
if ! grep -q "include.*sites-enabled" /opt/homebrew/etc/nginx/nginx.conf; then
    sed -i '' '/http {/a\
    include /opt/homebrew/etc/nginx/sites-enabled/*;\
' /opt/homebrew/etc/nginx/nginx.conf
fi

# Enable site
ln -sf /opt/homebrew/etc/nginx/sites-available/school-library /opt/homebrew/etc/nginx/sites-enabled/

# Test nginx configuration
/opt/homebrew/bin/nginx -t

# Start or reload nginx
brew services restart nginx

# Setup backup cron job (using launchd on macOS)
echo "📅 Setting up daily backup..."
chmod +x $APP_DIR/scripts/backup-macos.sh

# Create launchd plist for backup
BACKUP_PLIST="$HOME/Library/LaunchAgents/com.school-library.backup.plist"
cat > "$BACKUP_PLIST" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.school-library.backup</string>
    <key>ProgramArguments</key>
    <array>
        <string>$APP_DIR/scripts/backup-macos.sh</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>2</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>$APP_DIR/logs/backup-launchd.log</string>
    <key>StandardErrorPath</key>
    <string>$APP_DIR/logs/backup-launchd-error.log</string>
</dict>
</plist>
EOF

launchctl load "$BACKUP_PLIST" 2>/dev/null || echo "Backup job already loaded"

echo ""
echo "=========================================="
echo "✅ macOS Setup Complete!"
echo "=========================================="
echo ""
echo "📍 Application installed at: $APP_DIR"
echo "🌐 Access the application at: http://$SERVER_NAME:3000"
echo "🌐 Via Nginx at: http://$SERVER_NAME"
echo ""
echo "Default credentials:"
echo "  Admin: admin@school.edu / admin123"
echo "  Librarian: librarian@school.edu / librarian123"
echo ""
echo "⚠️  IMPORTANT: Change default passwords after first login!"
echo ""
echo "PM2 commands:"
echo "  pm2 status           - Check application status"
echo "  pm2 logs             - View application logs"
echo "  pm2 restart school-library - Restart application"
echo "  pm2 stop school-library    - Stop application"
echo ""
echo "Nginx commands:"
echo "  brew services restart nginx - Restart Nginx"
echo "  nginx -t                    - Test configuration"
echo "  tail -f /opt/homebrew/var/log/nginx/error.log - View logs"
echo ""
echo "PostgreSQL commands:"
echo "  brew services restart postgresql@16 - Restart PostgreSQL"
echo "  psql -d school_library             - Access database"
echo ""
echo "Backup location: $APP_DIR/backups"
echo "Daily backup scheduled at 2:00 AM via launchd"
echo ""
echo "To access from other devices on your network:"
echo "  1. Find your Mac's IP: System Settings → Network"
echo "  2. Update NEXTAUTH_URL in .env to your IP"
echo "  3. Restart: pm2 restart school-library"
echo ""
