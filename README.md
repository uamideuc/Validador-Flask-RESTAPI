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
│   │   ├── models/             # Modelos de datos con aislamiento de sesiones
│   │   │   ├── session_model.py # Gestión de sesiones JWT
│   │   │   └── database.py     # Base de datos con aislamiento
│   │   ├── services/           # Lógica de negocio con seguridad
│   │   │   └── file_security.py # Validación de archivos
│   │   ├── routes/             # Endpoints de API protegidos con JWT
│   │   │   └── auth.py         # Autenticación institucional
│   │   └── utils/              # Utilidades de seguridad
│   │       ├── session_auth.py # Decoradores de autorización
│   │       └── cleanup_scheduler.py # Limpieza automática
│   ├── setup_development.ps1   # Configuración de desarrollo seguro
│   ├── setup_production.ps1    # Configuración de producción
│   └── .env                    # Variables de entorno (claves secretas)
├── frontend/                   # React + TypeScript con Autenticación
│   ├── src/
│   │   ├── components/
│   │   │   └── Login.tsx       # Pantalla de login profesional
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx # Contexto de autenticación JWT
│   │   └── services/
│   │       └── api.ts          # Cliente HTTP con manejo automático de tokens
│   └── package.json
└── README.md
```

## Desarrollo

### 🚨 Configuración de Seguridad (REQUERIDA)

**IMPORTANTE**: La aplicación requiere configuración de seguridad antes del primer uso.

1. **Configurar entorno seguro del backend:**
```powershell
# En Windows PowerShell - EJECUTAR PRIMERO
.\backend\setup_development.ps1

# Esto genera automáticamente:
# - SECRET_KEY seguro de 32 caracteres
# - INSTITUTIONAL_ACCESS_KEY para tu organización
# - Archivo .env con configuración completa
```

2. **Activar entorno virtual y dependencias:**
```powershell
.\backend\activate.ps1
pip install -r backend\requirements.txt
```

3. **Instalar dependencias del frontend:**
```bash
cd frontend
npm install
```

### ⚙️ Configuración Manual (Alternativa)

Si prefieres configurar manualmente, crea `backend/.env`:
```env
SECRET_KEY=tu-clave-secreta-de-32-caracteres-minimo
INSTITUTIONAL_ACCESS_KEY=tu-clave-institucional
FLASK_ENV=development
```

### 🖥️ Backend (Flask Seguro)

```bash
# Con entorno virtual activado
python backend/run.py
```

El servidor estará disponible en http://localhost:5000

**Logs de inicio esperados:**
```
🛡️  Validador de Instrumentos - Secure Mode Enabled
🌍 Environment: development
🔑 Authentication: Required
🔒 CORS: Configured
⏰ Session Duration: 24 hours
```

### 🌐 Frontend (React con Autenticación)

```bash
cd frontend
npm start
```

La aplicación estará disponible en http://localhost:3000

**Primera vez**: Ingresa tu clave institucional configurada en `backend/.env`

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