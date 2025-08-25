# Production Security Setup Script for Validador de Instrumentos
# PowerShell version for Windows environments

Write-Host "Production Security Setup - Validador de Instrumentos" -ForegroundColor Red
Write-Host "====================================================" -ForegroundColor Red
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

Write-Host "Generating secure production configuration..." -ForegroundColor Cyan
Write-Host ""

# Function to generate secure random string
function Generate-SecureKey {
    param($Length)
    $chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    $key = ""
    for ($i = 0; $i -lt $Length; $i++) {
        $key += $chars[(Get-Random -Minimum 0 -Maximum $chars.Length)]
    }
    return $key
}

# Generate secure keys
$secretKey = Generate-SecureKey -Length 32
$institutionalKey = Generate-SecureKey -Length 24

Write-Host "Secret key generated (32 characters)" -ForegroundColor Green
Write-Host "Institutional access key generated (24 characters)" -ForegroundColor Green

# Get current date
$currentDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Create .env file content
$envContent = @"
# ============================================
# PRODUCTION SECURITY CONFIGURATION
# ============================================
# Generated on: $currentDate
# CRITICAL: Never commit this file to version control

# Flask secret key for session signing (NEVER share)
SECRET_KEY=$secretKey

# Institutional access key for user authentication
INSTITUTIONAL_ACCESS_KEY=$institutionalKey

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
"@

# Write .env file
$envContent | Out-File -FilePath ".env" -Encoding UTF8

Write-Host "Production .env file created" -ForegroundColor Green
Write-Host ""

# Display critical information
Write-Host ""
Write-Host "PRODUCTION SETUP COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "CRITICAL SECURITY INFORMATION:" -ForegroundColor Red
Write-Host "==============================" -ForegroundColor Red
Write-Host ""
Write-Host "SECRET_KEY (NEVER SHARE): $secretKey" -ForegroundColor Yellow
Write-Host "INSTITUTIONAL KEY: $institutionalKey" -ForegroundColor Yellow
Write-Host ""
Write-Host "IMPORTANT SECURITY NOTES:" -ForegroundColor Yellow
Write-Host "- NEVER commit the .env file to version control" -ForegroundColor Red
Write-Host "- NEVER share the SECRET_KEY with anyone" -ForegroundColor Red
Write-Host "- Share the INSTITUTIONAL_KEY with authorized users only" -ForegroundColor Green
Write-Host "- Update FRONTEND_URL in .env to match your domain" -ForegroundColor Green
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Edit FRONTEND_URL in .env to match your production domain" -ForegroundColor White
Write-Host "2. Install dependencies: pip install -r requirements.txt" -ForegroundColor White
Write-Host "3. Run security tests: python -m pytest tests/ -v" -ForegroundColor White
Write-Host "4. Deploy with: python run.py" -ForegroundColor White
Write-Host ""
Write-Host "DEPLOYMENT SECURITY CHECKLIST:" -ForegroundColor Red
Write-Host "- HTTPS configured with valid SSL certificate" -ForegroundColor White
Write-Host "- Firewall configured (only necessary ports open)" -ForegroundColor White
Write-Host "- Regular security updates scheduled" -ForegroundColor White
Write-Host "- Database backups configured" -ForegroundColor White
Write-Host "- Log monitoring configured" -ForegroundColor White
Write-Host ""
Write-Host "Your application is now configured for secure production deployment!" -ForegroundColor Green