# Development Security Setup Script for Validador de Instrumentos
# PowerShell version for Windows environments

Write-Host "Development Setup - Validador de Instrumentos" -ForegroundColor Yellow
Write-Host "==============================================" -ForegroundColor Yellow
Write-Host ""

# Check if .env already exists
if (Test-Path ".env") {
    Write-Host "WARNING: .env file already exists!" -ForegroundColor Yellow
    $response = Read-Host "Do you want to overwrite it? (y/N)"
    if ($response -ne "y" -and $response -ne "Y") {
        Write-Host "Setup cancelled." -ForegroundColor Red
        exit 1
    }
    if (Test-Path ".env.backup") {
        Remove-Item ".env.backup" -Force
    }
    Move-Item ".env" ".env.backup"
    Write-Host "Existing .env backed up as .env.backup" -ForegroundColor Green
}

Write-Host "Creating development configuration..." -ForegroundColor Cyan

# Get current date
$currentDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Create development .env file
$envContent = @"
# ============================================
# DEVELOPMENT CONFIGURATION
# ============================================
# Generated on: $currentDate
# FOR DEVELOPMENT USE ONLY - NOT FOR PRODUCTION

# Development secret key (CHANGE IN PRODUCTION)
SECRET_KEY=dev-secret-key-change-in-production

# Development institutional access key
INSTITUTIONAL_ACCESS_KEY=dev-access-2025

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
"@

# Write .env file
$envContent | Out-File -FilePath ".env" -Encoding UTF8

Write-Host "Development .env file created" -ForegroundColor Green
Write-Host ""

# Display information
Write-Host ""
Write-Host "DEVELOPMENT SETUP COMPLETED!" -ForegroundColor Green
Write-Host "============================" -ForegroundColor Green
Write-Host ""
Write-Host "DEVELOPMENT CREDENTIALS:" -ForegroundColor Cyan
Write-Host "Institutional Access Key: dev-access-2024" -ForegroundColor White
Write-Host ""
Write-Host "SECURITY REMINDERS:" -ForegroundColor Yellow
Write-Host "- This configuration is NOT secure for production" -ForegroundColor Red
Write-Host "- NEVER use these keys in production" -ForegroundColor Red
Write-Host "- Run setup_production.ps1 before deploying" -ForegroundColor Green
Write-Host ""
Write-Host "NEXT STEPS FOR DEVELOPMENT:" -ForegroundColor Cyan
Write-Host "1. Install dependencies: pip install -r requirements.txt" -ForegroundColor White
Write-Host "2. Start backend: python run.py" -ForegroundColor White
Write-Host "3. Start frontend: cd ../frontend && npm start" -ForegroundColor White
Write-Host "4. Access at: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "TESTING:" -ForegroundColor Cyan
Write-Host "Run tests: python -m pytest tests/ -v" -ForegroundColor White
Write-Host ""
Write-Host "Ready for development!" -ForegroundColor Green