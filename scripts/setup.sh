#!/bin/bash

# School Library Management System - Setup Script
# For Ubuntu/Debian systems
# Run as regular user with sudo privileges

set -e  # Exit on any error

echo "=========================================="
echo "School Library Management System - Setup"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "ERROR: Do not run this script as root. Run as a regular user with sudo privileges."
    exit 1
fi

# Update system packages
echo "📦 Updating system packages..."
sudo apt update
sudo apt upgrade -y

# Install required packages
echo "📦 Installing required packages..."
sudo apt install -y curl git build-essential postgresql postgresql-contrib nginx

# Install Node.js 20.x (LTS)
echo "📦 Installing Node.js 20.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"

# Install PM2 globally
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Create application directory
APP_DIR="/opt/school-library"
echo "📁 Creating application directory at $APP_DIR..."
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

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

sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "Database already exists"
sudo -u postgres psql -c "CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';" 2>/dev/null || echo "User already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;"

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

# Run Prisma migrations
echo "🗄️  Running database migrations..."
npx prisma migrate deploy
npx prisma db seed

# Build Next.js application
echo "🔨 Building Next.js application..."
npm run build

# Create logs directory
mkdir -p $APP_DIR/logs
mkdir -p $APP_DIR/backups

# Setup PM2
echo "🚀 Setting up PM2..."
pm2 delete school-library 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

# Setup PM2 startup script
echo "🚀 Configuring PM2 to start on boot..."
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER
pm2 save

# Setup Nginx
echo "🌐 Configuring Nginx..."
sudo cp nginx.conf.example /etc/nginx/sites-available/school-library

# Update server_name in nginx config
read -p "Enter your server domain or IP (default: localhost): " SERVER_NAME
SERVER_NAME=${SERVER_NAME:-localhost}
sudo sed -i "s/your-server-name-or-ip/$SERVER_NAME/g" /etc/nginx/sites-available/school-library

# Enable site
sudo ln -sf /etc/nginx/sites-available/school-library /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Setup daily backup cron job
echo "📅 Setting up daily backup cron job..."
chmod +x $APP_DIR/scripts/backup.sh
(crontab -l 2>/dev/null | grep -v "school-library backup"; echo "0 2 * * * $APP_DIR/scripts/backup.sh") | crontab -

echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "📍 Application installed at: $APP_DIR"
echo "🌐 Access the application at: http://$SERVER_NAME"
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
echo "Backup location: $APP_DIR/backups"
echo "Daily backup scheduled at 2:00 AM"
echo ""
