# Script para activar el entorno virtual en Windows PowerShell
# Uso: .\backend\activate.ps1

Write-Host "Activando entorno virtual del backend..." -ForegroundColor Green
& .\backend\venv\Scripts\Activate.ps1

Write-Host "Entorno virtual activado. Dependencias instaladas:" -ForegroundColor Green
python -m pip list | Select-String "Flask|pandas|pytest"

Write-Host "`nPara ejecutar el servidor de desarrollo:" -ForegroundColor Yellow
Write-Host "python backend/run.py" -ForegroundColor Cyan

Write-Host "`nPara ejecutar tests:" -ForegroundColor Yellow  
Write-Host "python -m pytest backend/tests/ -v" -ForegroundColor Cyan