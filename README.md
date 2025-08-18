# Validador de Instrumentos

Aplicación web para validar bases de datos de instrumentos educativos o de evaluación.

## Características

- Carga de archivos XLSX y CSV
- Categorización de variables mediante drag-and-drop
- Validación automática de duplicados, metadata y clasificación
- Generación de reportes profesionales
- Exportación de datos normalizados

## Estructura del Proyecto

```
├── backend/           # Flask API
│   ├── app/
│   │   ├── models/    # Modelos de datos
│   │   ├── services/  # Lógica de negocio
│   │   └── routes/    # Endpoints de API
│   └── requirements.txt
├── frontend/          # React + TypeScript
│   ├── src/
│   │   └── components/
│   └── package.json
└── README.md
```

## Desarrollo

### Configuración Inicial

1. **Activar entorno virtual del backend:**
```powershell
# En Windows PowerShell
.\backend\activate.ps1

# O manualmente:
backend\venv\Scripts\activate.ps1
pip install -r backend\requirements.txt
```

2. **Instalar dependencias del frontend:**
```bash
cd frontend
npm install
```

### Backend (Flask)

```bash
# Con entorno virtual activado
python backend/run.py
```

El servidor estará disponible en http://localhost:5000

### Frontend (React)

```bash
cd frontend
npm start
```

La aplicación estará disponible en http://localhost:3000

### Tests

```bash
# Backend tests (con entorno virtual activado)
python -m pytest backend/tests/ -v

# Frontend tests
cd frontend
npm test
```

## Tecnologías

- **Backend**: Flask, Python, Pandas, OpenPyXL
- **Frontend**: React, TypeScript, Material-UI, React DnD
- **Base de datos**: SQLite (desarrollo)

## Estado del Desarrollo

✅ **Completado - Todas las tareas implementadas:**

### Backend (Flask + Python)
- ✅ Estructura del proyecto y configuración del entorno
- ✅ Modelos de datos y esquema de base de datos SQLite
- ✅ Servicio de carga y parsing de archivos (CSV/Excel)
- ✅ API REST completa para operaciones de archivos
- ✅ Motor de validación de duplicados, metadata y clasificación
- ✅ Generador de reportes de validación
- ✅ Normalizador de datos y exportación a Excel
- ✅ Endpoints de validación y exportación
- ✅ Manejo de errores y optimizaciones de rendimiento
- ✅ Tests comprehensivos (62 tests pasando)

### Frontend (React + TypeScript)
- ✅ Componente de carga de archivos con drag-and-drop
- ✅ Componente de categorización de variables con drag-and-drop
- ✅ Componente de reporte de validación profesional
- ✅ Integración completa del flujo de trabajo
- ✅ Interfaz Material-UI elegante y responsiva
- ✅ Manejo de estados y errores

### Funcionalidades Principales
- 📁 **Carga de archivos**: CSV, XLS, XLSX con selección de hojas
- 🏷️ **Categorización**: Drag-and-drop para 4 categorías de variables
- 🔍 **Validaciones**: Duplicados, metadata completa, clasificación
- 📊 **Reportes**: Visualización profesional de resultados
- 📤 **Exportación**: Datos normalizados con nombres estandarizados

## API Endpoints

### Archivos
- `POST /api/files/upload` - Subir archivo
- `GET /api/files/{id}/sheets` - Obtener hojas de Excel
- `POST /api/files/{id}/parse` - Parsear archivo
- `GET /api/files/{id}/variables` - Obtener variables
- `POST /api/files/{id}/categorization` - Guardar categorización

### Validación
- `POST /api/validation/run` - Ejecutar validaciones
- `GET /api/validation/{id}/report` - Obtener reporte

### Exportación
- `POST /api/export/normalized` - Exportar datos normalizados
- `GET /api/export/{id}/download` - Descargar archivo