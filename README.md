# Validador de Instrumentos 🛡️

**Aplicación web segura y de grado empresarial** para validar bases de datos de instrumentos educativos o de evaluación.

## 🔐 Características de Seguridad

- **Autenticación Institucional**: Sistema de login con clave institucional compartida
- **Sesiones Aisladas**: Cada usuario tiene acceso únicamente a sus propios datos
- **Tokens JWT**: Manejo seguro de autenticación con expiración automática (24 horas)
- **Limpieza Automática**: Eliminación programada de archivos y sesiones expiradas
- **Validación de Archivos**: Escaneo de seguridad y detección MIME avanzada
- **Headers de Seguridad**: Protecciones CORS y headers HTTP comprehensivos

## ✨ Características Funcionales

- **Carga de archivos** XLSX y CSV con escaneo de seguridad
- **Preview de datos** interactivo durante la categorización de variables
- **Categorización de variables** mediante drag-and-drop intuitivo
- **Validación automática** de duplicados, metadata y clasificación con parámetros transparentes
- **Soporte para instrumentos únicos** (bases sin variables de instrumento)
- **Generación de reportes** profesionales en PDF y Excel
- **Exportación de datos** normalizados y con errores marcados
- **Interfaz en Español** con mensajes de error amigables para el usuario

## Estructura del Proyecto

```
├── backend/                    # Flask API Seguro
│   ├── app/
│   │   ├── __init__.py         # Factory de aplicación con configuración JWT
│   │   ├── models/             # Modelos de datos y base de datos
│   │   │   ├── __init__.py
│   │   │   ├── data_models.py  # Modelos de datos (VariableCategorization, ValidationReport)
│   │   │   ├── database.py     # Manager de base de datos SQLite con aislamiento
│   │   │   └── session_model.py # Gestión de sesiones JWT
│   │   ├── routes/             # Endpoints de API protegidos con JWT
│   │   │   ├── __init__.py
│   │   │   ├── auth.py         # Autenticación institucional
│   │   │   ├── files.py        # Carga y procesamiento de archivos
│   │   │   ├── validation.py   # Ejecución de validaciones
│   │   │   └── export.py       # Exportación de datos y reportes
│   │   ├── services/           # Lógica de negocio
│   │   │   ├── __init__.py
│   │   │   ├── file_service.py # Servicio de carga y parsing de archivos
│   │   │   ├── file_security.py # Validación de seguridad de archivos
│   │   │   ├── validation_engine.py # Motor de validación principal
│   │   │   ├── data_normalizer.py # Normalización y exportación
│   │   │   └── pdf_generator.py # Generación de reportes PDF
│   │   └── utils/              # Utilidades de seguridad
│   │       ├── session_auth.py # Decoradores de autorización
│   │       └── cleanup_scheduler.py # Limpieza automática
│   ├── tests/                  # Suite de tests completa (25+ tests)
│   │   ├── __init__.py
│   │   ├── test_app.py         # Tests de aplicación
│   │   ├── test_api_files.py   # Tests de API de archivos
│   │   ├── test_file_service.py # Tests de servicio de archivos
│   │   ├── test_validation_engine.py # Tests del motor de validación
│   │   ├── test_data_normalizer.py # Tests de normalización
│   │   └── test_models.py      # Tests de modelos
│   ├── uploads/                # Directorio temporal de archivos subidos
│   ├── run.py                  # Punto de entrada del servidor de desarrollo
│   ├── requirements.txt        # Dependencias de Python
│   ├── activate.ps1           # Activación de entorno virtual
│   ├── start_dev.ps1          # 🚀 Script de setup completo (NUEVO)
│   ├── validador.db           # Base de datos SQLite
│   └── .env                   # Variables de entorno (claves secretas)
├── frontend/                   # React + TypeScript con Autenticación
│   ├── src/
│   │   ├── App.tsx            # Componente principal con manejo de estado
│   │   ├── index.tsx          # Punto de entrada de React
│   │   ├── components/        # Componentes de UI
│   │   │   ├── Login.tsx      # Pantalla de login profesional
│   │   │   ├── FileUpload.tsx # Carga de archivos con drag-and-drop
│   │   │   ├── DataPreview.tsx # Preview paginado de datos
│   │   │   ├── VariableCategorization.tsx # Categorización drag-and-drop
│   │   │   ├── ValidationReport.jsx # Reporte de validación profesional
│   │   │   └── ClassificationValuesModal.jsx # Modal de valores detallados
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx # Contexto de autenticación JWT
│   │   ├── services/
│   │   │   └── api.ts         # Cliente HTTP con manejo automático de tokens
│   │   └── types/
│   │       └── index.ts       # Definiciones de tipos TypeScript
│   ├── public/
│   │   └── index.html         # Template HTML principal
│   ├── package.json           # Dependencias y scripts de npm
│   ├── package-lock.json      # Lock de versiones exactas
│   ├── tsconfig.json          # Configuración de TypeScript
│   └── craco.config.js        # Configuración de build personalizada
├── uploads/                    # Directorio de archivos temporales (raíz)
├── README.md                  # Este archivo
└── README_4dummys.md         # Guía simplificada para usuarios
```

## Desarrollo

### 🚀 Inicio Rápido (Un Solo Comando)

**NUEVO**: Configuración automatizada con un solo script

```powershell
# Desde la carpeta raíz del proyecto
.\backend\start_dev.ps1
```

Este script automáticamente:
- ✅ Verifica Python y Node.js
- ✅ Crea y activa entorno virtual Python
- ✅ Instala dependencias Python (`pip install -r requirements.txt`)
- ✅ Configura ambiente seguro (genera claves si no existen)
- ✅ Instala dependencias Node.js (`npm install` en frontend)
- ✅ Limpia base de datos para desarrollo limpio
- ✅ **Todo listo para iniciar backend y frontend**

### 🎯 Iniciar Servicios

**Después de ejecutar `start_dev.ps1`:**

1. **Backend (Terminal 1):**
```powershell
# Desde carpeta backend/ (con entorno virtual ya activado)
python run.py
```
Servidor disponible en http://localhost:5000

2. **Frontend (Terminal 2):**
```bash
cd frontend
npm start
```
Aplicación disponible en http://localhost:3000

**Primera vez**: Ingresa tu clave institucional mostrada en los logs del backend

### 🛠️ Opciones Avanzadas del Script

```powershell
# Limpiar completamente cache y dependencias
.\backend\start_dev.ps1 -Clean

# Solo verificar configuración (no iniciar)
.\backend\start_dev.ps1 -VerifyOnly

# Limpiar y verificar
.\backend\start_dev.ps1 -Clean -VerifyOnly
```

### ⚙️ Configuración Manual (Alternativa)

Si prefieres configurar paso a paso:

1. **Crear entorno virtual:**
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
```

2. **Instalar dependencias:**
```powershell
pip install -r requirements.txt
```

3. **Configurar ambiente:**
```powershell
.\setup_development.ps1
```

4. **Instalar frontend:**
```bash
cd frontend
npm install
```

### 📋 Logs de Inicio Esperados

**Backend:**
```
🛡️  Validador de Instrumentos - Secure Mode Enabled
🌍 Environment: development
🔑 Authentication: Required
🔒 CORS: Configured
⏰ Session Duration: 24 hours
🔑 INSTITUTIONAL_ACCESS_KEY: tu-clave-aqui
```

**Frontend:**
```
webpack compiled successfully
Local:   http://localhost:3000
Network: http://192.168.x.x:3000
```

### Tests

```bash
# Backend tests (con entorno virtual activado)
python -m pytest backend/tests/ -v

# Frontend tests
cd frontend
npm test
```

## 🛠️ Tecnologías

### Backend (Seguro)
- **Framework**: Flask con Flask-JWT-Extended
- **Procesamiento**: Python, Pandas, OpenPyXL
- **Seguridad**: JWT, Session Management, File Security
- **Base de datos**: SQLite con aislamiento de sesiones
- **Limpieza**: Scheduler automático de archivos expirados

### Frontend (Autenticado)
- **Framework**: React con TypeScript
- **UI**: Material-UI con componentes personalizados
- **Interacción**: React DnD para drag-and-drop
- **Autenticación**: Context API con manejo automático de JWT
- **HTTP**: Axios con interceptors para tokens automáticos

### Infraestructura
- **Desarrollo**: Scripts PowerShell para configuración segura
- **Producción**: Variables de entorno validadas y headers de seguridad
- **Monitoreo**: Logs de seguridad y detección de requests sospechosas

## 🎉 Estado del Desarrollo

✅ **COMPLETADO - Sistema Seguro y Listo para Producción**

### 🔐 Seguridad (NUEVA - Implementación Completa)
- ✅ **Sistema de autenticación institucional** con JWT
- ✅ **Gestión de sesiones** con aislamiento de datos por usuario
- ✅ **Validación de archivos** con escaneo de seguridad y MIME
- ✅ **Limpieza automática** de archivos y sesiones expiradas
- ✅ **Headers de seguridad** y protección CORS
- ✅ **Scripts de configuración** para desarrollo y producción
- ✅ **Monitoreo de seguridad** con detección de requests maliciosas

### 🖥️ Backend (Flask + Python) - Actualizado con Seguridad
- ✅ Estructura del proyecto con módulos de seguridad
- ✅ Modelos de datos con aislamiento de sesiones SQLite
- ✅ Servicio de carga con validación de seguridad de archivos
- ✅ API REST completamente protegida con JWT
- ✅ Motor de validación con control de acceso por sesión
- ✅ Generador de reportes con protección de datos
- ✅ Normalizador y exportación con aislamiento de sesiones
- ✅ Endpoints con autenticación y autorización completa
- ✅ Manejo seguro de errores sin filtración de información
- ✅ Tests comprehensivos actualizados (25+ tests pasando)

### 🌐 Frontend (React + TypeScript) - Actualizado con Autenticación
- ✅ **Sistema de login profesional** en español
- ✅ **Context de autenticación** con manejo automático de JWT
- ✅ **Interceptors HTTP** para tokens transparentes
- ✅ Componente de carga de archivos con validación
- ✅ Componente de categorización con protección de sesión
- ✅ Componente de reporte con datos aislados por usuario
- ✅ Integración completa del flujo autenticado
- ✅ Interfaz Material-UI con mensajes en español
- ✅ Manejo de errores de autenticación y autorización

### 🚀 Funcionalidades Principales (Actualizadas)
- 🔑 **Autenticación**: Login institucional con clave compartida
- 👤 **Sesiones**: Aislamiento completo de datos por usuario
- 📁 **Carga segura**: CSV, XLS, XLSX con escaneo de seguridad
- 🏷️ **Categorización**: Drag-and-drop protegido por sesión
- 🔍 **Validaciones**: Duplicados, metadata, clasificación (datos aislados)
- 📊 **Reportes**: Visualización profesional de resultados propios
- 📤 **Exportación**: Datos normalizados con protección de sesión
- 🧹 **Limpieza**: Eliminación automática de datos expirados

## 🔌 API Endpoints (Todos Protegidos con JWT)

### 🔐 Autenticación (`/api/auth/`)
- `POST /institutional-login` - Login con clave institucional → JWT token
- `GET /session-info` - Información de sesión actual
- `POST /logout` - Logout e invalidación de sesión

### 📁 Archivos (`/api/files/`) - Requiere JWT + Propiedad de Sesión
- `POST /upload` - Subir archivo (con escaneo de seguridad)
- `GET /{id}/sheets` - Obtener hojas de Excel
- `POST /{id}/parse` - Parsear archivo
- `POST /{id}/preview` - Preview paginado de datos
- `POST /{id}/categorization` - Guardar categorización → Crear sesión de validación

### ✅ Validación (`/api/validation/`) - Requiere JWT + Propiedad de Sesión
- `POST /run` - Ejecutar validaciones
- `GET /{session_id}/report` - Obtener reporte
- `POST /{session_id}/variable-values` - Valores detallados de variables

### 📤 Exportación (`/api/export/`) - Requiere JWT + Propiedad de Sesión
- `POST /normalized` - Exportar datos normalizados
- `POST /validation-excel/{id}` - Exportar Excel con errores marcados
- `POST /validation-report/{id}` - Exportar reporte PDF
- `GET /{export_id}/download` - Descargar archivo generado

---

## 🔒 Notas de Seguridad

- **Todos los endpoints** (excepto `/api/auth/institutional-login`) requieren JWT válido
- **Aislamiento de sesiones**: Los usuarios solo pueden acceder a sus propios datos
- **Expiración automática**: Sesiones y archivos se eliminan automáticamente después de 24 horas
- **Validación de archivos**: Todos los uploads pasan por escaneo de seguridad
- **Steam interference**: La aplicación puede recibir requests harmless de Steam buscando servidores de juegos (ignorar logs 405)