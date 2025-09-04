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
.
├── backend/                                # Lógica del Servidor (API en Flask)
│   ├── app/
│   │   ├── __init__.py                     # Fábrica de la aplicación Flask
│   │   ├── api/                            # Capa de API: Endpoints HTTP
│   │   │   ├── __init__.py                 # Inicializador del módulo de API
│   │   │   ├── auth.py                     # Endpoints para autenticación y sesión
│   │   │   ├── files.py                    # Endpoints para carga y gestión de archivos
│   │   │   └── tool_runner.py              # Endpoint genérico para ejecutar herramientas
│   │   ├── core/                           # Capa Core: Infraestructura compartida
│   │   │   ├── __init__.py                 # Inicializador del módulo core
│   │   │   ├── database.py                 # Gestor de la base de datos (SQLite)
│   │   │   ├── models.py                   # Modelos de datos (dataclasses)
│   │   │   └── services/                   # Servicios transversales
│   │   │       ├── __init__.py             # Inicializador de servicios
│   │   │       ├── cleanup_service.py      # Servicio de limpieza automática de datos
│   │   │       ├── file_service.py         # Servicio para subida y parseo de archivos
│   │   │       ├── security_service.py     # Decoradores y validadores de seguridad
│   │   │       └── session_service.py      # Servicio para gestión de sesiones
│   │   └── tools/                          # Capa de Herramientas: Lógica de negocio (Plugins)
│   │       ├── __init__.py                 # Fábrica y registro de ToolKits
│   │       ├── common_checks/              # Validaciones reutilizables entre herramientas
│   │       │   └── check_duplicates.py     # Lógica para la validación de duplicados
│   │       └── ensamblaje_tool/            # ToolKit específico para "Ensamblaje"
│   │           ├── __init__.py             # Define la interfaz del ToolKit
│   │           ├── constants.py            # Constantes específicas de la herramienta
│   │           ├── exporter.py             # Orquesta las exportaciones de la herramienta
│   │           ├── validator.py            # Orquesta las validaciones de la herramienta
│   │           ├── checks/                 # Validaciones específicas de la herramienta
│   │           └── export_formats/         # Formatos de exportación específicos
│   ├── tests/                              # Tests unitarios y de integración
│   ├── uploads/                            # Directorio temporal para archivos subidos
│   ├── run.py                              # Punto de entrada para iniciar el servidor
│   ├── requirements.txt                    # Dependencias de Python
│   └── ...
├── frontend/                               # Interfaz de Usuario (React + TypeScript)
│   ├── src/
│   │   ├── App.tsx                         # Componente raíz, enrutador principal
│   │   ├── index.tsx                       # Punto de entrada de la aplicación React
│   │   ├── components/                     # Componentes de UI genéricos y reutilizables
│   │   │   └── LoginForm.tsx               # Formulario de login
│   │   ├── core/                           # Lógica central y compartida del frontend
│   │   │   ├── api.ts                      # Cliente HTTP (axios) para el backend
│   │   │   └── auth.tsx                    # Contexto y lógica de autenticación
│   │   ├── pages/                          # Vistas principales de la aplicación
│   │   │   ├── Login.tsx                   # Página de inicio de sesión
│   │   │   └── Tool.tsx                    # Contenedor que carga la herramienta activa
│   │   └── tools/                          # "Mini-aplicaciones" por cada herramienta
│   │       └── ensamblaje-validator/
│   │           ├── index.tsx               # Orquestador de la herramienta (lógica y estado)
│   │           └── components/             # Componentes de UI específicos de la herramienta
│   │               ├── FileUpload.tsx      # Componente para subir archivos
│   │               ├── DataPreview.tsx     # Componente para previsualizar datos
│   │               └── ...
│   ├── public/
│   │   └── index.html                      # Template HTML principal
│   ├── package.json                        # Dependencias y scripts de npm
│   └── ...
└── README.md                               # Documentación principal
```

## Desarrollo

### 🚀 Inicio Rápido (Un Solo Comando)

**NUEVO**: Configuración automatizada con un solo script

```powershell
# Desde la carpeta raíz del proyecto
cd backend
.\start_dev.ps1 # Si es macOS o Linux reemplazar script/ por bin/ dentro del script
```
pip install -r requirements.txt
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
npm install ## Si corresponde o es primer uso
npm start
```
Aplicación disponible en http://localhost:3000

**Primera vez**: Ingresa tu clave institucional mostrada en los logs del backend

### Tests

```bash
# Backend tests (con entorno virtual activado)
python -m pytest backend/tests/ -v

# Frontend tests
cd frontend
npm test
```

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

### ✅ Herramientas (`/api/tools/`) - Requiere JWT + Propiedad de Sesión
- `GET /available` - Listar herramientas disponibles
- `POST /{tool_name}/run` - Ejecutar validación de una herramienta
- `POST /{tool_name}/export` - Exportar datos o reportes de una herramienta
- `GET /{tool_name}/download/{export_id}` - Descargar archivo generado
- `POST /{tool_name}/variable-values` - Obtener valores detallados de variables

---

## 🔒 Notas de Seguridad

- **Todos los endpoints** (excepto `/api/auth/institutional-login`) requieren JWT válido
- **Aislamiento de sesiones**: Los usuarios solo pueden acceder a sus propios datos
- **Expiración automática**: Sesiones y archivos se eliminan automáticamente después de 24 horas
- **Validación de archivos**: Todos los uploads pasan por escaneo de seguridad

---