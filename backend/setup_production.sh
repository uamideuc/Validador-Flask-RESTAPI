#!/bin/bash
# Production Security Setup Script for Validador de Instrumentos
# This script generates secure configuration for production deployment

echo "🛡️  PRODUCTION SECURITY SETUP - VALIDADOR DE INSTRUMENTOS"
echo "========================================================"
echo ""

# Check if .env already exists
if [ -f ".env" ]; then
    echo "⚠️  WARNING: .env file already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 1
    fi
    mv .env .env.backup
    echo "📦 Existing .env backed up as .env.backup"
fi

echo "🔐 Generating secure production configuration..."
echo ""

# Generate secure secret key (32 bytes = 256 bits)
SECRET_KEY=$(openssl rand -base64 48 | tr -d "=+/" | cut -c1-32)
echo "✅ Secret key generated (32 characters)"

# Generate institutional access key (24 bytes = 192 bits) 
INSTITUTIONAL_KEY=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-24)
echo "✅ Institutional access key generated (24 characters)"

# Create .env file
cat > .env << EOF
# ============================================
# PRODUCTION SECURITY CONFIGURATION
# ============================================
# Generated on: $(date)
# CRITICAL: Never commit this file to version control

# Flask secret key for session signing (NEVER share)
SECRET_KEY=${SECRET_KEY}

# Institutional access key for user authentication
INSTITUTIONAL_ACCESS_KEY=${INSTITUTIONAL_KEY}

# ============================================
# ENVIRONMENT CONFIGURATION
# ============================================

# Environment (CRITICAL: Must be 'production')
FLASK_ENV=production

# Frontend URL for CORS (REQUIRED in production)
FRONTEND_URL=https://yourdomain.com

# Database path
DATABASE_PATH=validador.db

# ============================================
# OPTIONAL CONFIGURATION
# ============================================

# Port (default: 5000)
# PORT=5000

# Upload directory (default: uploads)
# UPLOAD_FOLDER=uploads

# Max file size in bytes (default: 16MB)
# MAX_CONTENT_LENGTH=16777216

# Log level (default: INFO)
# LOG_LEVEL=INFO

# Log file path
# LOG_FILE=app.log
EOF

echo "✅ Production .env file created"
echo ""

# Set secure permissions on .env file
chmod 600 .env
echo "🔒 Secure file permissions set (600)"

# Display critical information
echo ""
echo "🎯 PRODUCTION SETUP COMPLETED SUCCESSFULLY!"
echo "=========================================="
echo ""
echo "🔐 CRITICAL SECURITY INFORMATION:"
echo "================================="
echo ""
echo "SECRET_KEY (NEVER SHARE): ${SECRET_KEY}"
echo "INSTITUTIONAL KEY: ${INSTITUTIONAL_KEY}"
echo ""
echo "⚠️  IMPORTANT SECURITY NOTES:"
echo "❌ NEVER commit the .env file to version control"
echo "❌ NEVER share the SECRET_KEY with anyone"
echo "✅ Share the INSTITUTIONAL_KEY with authorized users only"
echo "✅ Update FRONTEND_URL in .env to match your domain"
echo ""
echo "📋 NEXT STEPS:"
echo "1. Edit FRONTEND_URL in .env to match your production domain"
echo "2. Install dependencies: pip install -r requirements.txt"
echo "3. Run security tests: python -m pytest tests/test_security.py"
echo "4. Deploy with: gunicorn --bind 0.0.0.0:5000 run:app"
echo ""
echo "🚨 DEPLOYMENT SECURITY CHECKLIST:"
echo "□ HTTPS configured with valid SSL certificate"
echo "□ Firewall configured (only ports 80, 443 open)"
echo "□ Regular security updates scheduled"
echo "□ Database backups configured"
echo "□ Log monitoring configured"
echo ""
echo "✨ Your application is now configured for secure production deployment!"