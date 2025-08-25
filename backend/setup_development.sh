#!/bin/bash
# Development Security Setup Script for Validador de Instrumentos
# This script creates a simple configuration for development use

echo "🚧 DEVELOPMENT SETUP - VALIDADOR DE INSTRUMENTOS"
echo "================================================"
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

echo "🔧 Creating development configuration..."

# Create development .env file
cat > .env << EOF
# ============================================
# DEVELOPMENT CONFIGURATION
# ============================================
# Generated on: $(date)
# ⚠️ FOR DEVELOPMENT USE ONLY - NOT FOR PRODUCTION

# Development secret key (CHANGE IN PRODUCTION)
SECRET_KEY=dev-secret-key-change-in-production

# Development institutional access key
INSTITUTIONAL_ACCESS_KEY=dev-access-2024

# ============================================
# DEVELOPMENT ENVIRONMENT
# ============================================

# Environment
FLASK_ENV=development

# Frontend URL (React dev server)
FRONTEND_URL=http://localhost:3000

# Database path (development database)
DATABASE_PATH=validador_dev.db

# ============================================
# OPTIONAL DEVELOPMENT SETTINGS
# ============================================

# Port (default: 5000)
# PORT=5000

# Enable debug mode (development only)
# DEBUG=true

# Log level for development
# LOG_LEVEL=DEBUG
EOF

echo "✅ Development .env file created"
echo ""

# Set permissions
chmod 600 .env
echo "🔒 File permissions set"

# Display information
echo ""
echo "✨ DEVELOPMENT SETUP COMPLETED!"
echo "==============================="
echo ""
echo "🔑 DEVELOPMENT CREDENTIALS:"
echo "Institutional Access Key: dev-access-2024"
echo ""
echo "⚠️  SECURITY REMINDERS:"
echo "❌ This configuration is NOT secure for production"
echo "❌ NEVER use these keys in production"
echo "✅ Run setup_production.sh before deploying"
echo ""
echo "📋 NEXT STEPS FOR DEVELOPMENT:"
echo "1. Install dependencies: pip install -r requirements.txt"
echo "2. Start backend: python run.py"
echo "3. Start frontend: cd ../frontend && npm start"
echo "4. Access at: http://localhost:3000"
echo ""
echo "🧪 TESTING:"
echo "Run tests: python -m pytest tests/ -v"
echo ""
echo "🚀 Ready for development!"