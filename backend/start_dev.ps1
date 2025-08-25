# Script de desarrollo para Validador de Instrumentos
# Uso: .\start_dev.ps1 (desde carpeta backend)

param(
    [switch]$Clean,
    [switch]$VerifyOnly
)

Write-Host "Validador de Instrumentos - Setup de Desarrollo" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green

# Limpiar si se solicita
if ($Clean) {
    Write-Host "Limpiando cache de desarrollo..." -ForegroundColor Yellow
    
    if (Test-Path "validador.db") {
        Remove-Item "validador.db" -Force
        Write-Host "Base de datos eliminada" -ForegroundColor Gray
    }
    
    if (Test-Path "venv") {
        Remove-Item "venv" -Recurse -Force
        Write-Host "Entorno virtual eliminado" -ForegroundColor Gray
    }
    
    if (Test-Path "..\frontend\node_modules") {
        Remove-Item "..\frontend\node_modules" -Recurse -Force
        Write-Host "node_modules eliminado" -ForegroundColor Gray
    }
    
    Write-Host "Cache limpiado completamente" -ForegroundColor Green
    
    if ($VerifyOnly) {
        exit 0
    }
}

# Verificar Python
Write-Host "Verificando Python..." -ForegroundColor Cyan
$pythonVersion = python --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Python no encontrado" -ForegroundColor Red
    exit 1
}
Write-Host "Python OK: $pythonVersion" -ForegroundColor Green

# Verificar Node.js
Write-Host "Verificando Node.js..." -ForegroundColor Cyan
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Node.js no encontrado" -ForegroundColor Red
    exit 1
}
Write-Host "Node.js OK: $nodeVersion" -ForegroundColor Green

# Crear entorno virtual si no existe
if (-not (Test-Path "venv")) {
    Write-Host "Creando entorno virtual..." -ForegroundColor Yellow
    python -m venv venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: No se pudo crear entorno virtual" -ForegroundColor Red
        exit 1
    }
    Write-Host "Entorno virtual creado" -ForegroundColor Green
    $needsInstall = $true
} else {
    Write-Host "Entorno virtual encontrado" -ForegroundColor Green
    $needsInstall = $false
}

# Activar entorno virtual
Write-Host "Activando entorno virtual..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1

# Verificar que esta activo
if (-not $env:VIRTUAL_ENV) {
    Write-Host "ERROR: Entorno virtual no se activo correctamente" -ForegroundColor Red
    exit 1
}
Write-Host "Entorno virtual activo" -ForegroundColor Green

# Instalar dependencias Python si es necesario
if ($needsInstall) {
    Write-Host "Instalando dependencias Python..." -ForegroundColor Yellow
    pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: No se pudieron instalar dependencias Python" -ForegroundColor Red
        exit 1
    }
    Write-Host "Dependencias Python instaladas" -ForegroundColor Green
} else {
    Write-Host "Verificando dependencias Python..." -ForegroundColor Cyan
    Write-Host "Dependencias Python OK" -ForegroundColor Green
}

# Configurar ambiente si no existe
if (-not (Test-Path ".env")) {
    Write-Host "Configurando ambiente de desarrollo..." -ForegroundColor Yellow
    & .\setup_development.ps1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: No se pudo configurar ambiente" -ForegroundColor Red
        exit 1
    }
    Write-Host "Ambiente configurado" -ForegroundColor Green
} else {
    Write-Host "Configuracion de ambiente existente" -ForegroundColor Green
}

# Verificar dependencias Node.js
if (-not (Test-Path "..\frontend\node_modules")) {
    Write-Host "Instalando dependencias Node.js..." -ForegroundColor Yellow
    Push-Location ..\frontend
    npm install
    $npmResult = $LASTEXITCODE
    Pop-Location
    
    if ($npmResult -ne 0) {
        Write-Host "ERROR: No se pudieron instalar dependencias Node.js" -ForegroundColor Red
        exit 1
    }
    Write-Host "Dependencias Node.js instaladas" -ForegroundColor Green
} else {
    Write-Host "Dependencias Node.js OK" -ForegroundColor Green
}

# Limpiar/migrar base de datos
if (Test-Path "validador.db") {
    Write-Host "Limpiando base de datos existente..." -ForegroundColor Yellow
    Remove-Item "validador.db" -Force
    Write-Host "Base de datos limpiada" -ForegroundColor Green
}

# Si solo es verificacion, salir
if ($VerifyOnly) {
    Write-Host ""
    Write-Host "Verificacion completada - Todo listo!" -ForegroundColor Green
    Write-Host "Para iniciar backend: python run.py" -ForegroundColor Cyan
    Write-Host "Para iniciar frontend: cd ..\frontend && npm start" -ForegroundColor Cyan
    exit 0
}

Write-Host ""
Write-Host "Setup completado!" -ForegroundColor Green
Write-Host "Para iniciar backend: python run.py" -ForegroundColor Cyan
Write-Host "Para iniciar frontend: cd ..\frontend && npm start" -ForegroundColor Cyan