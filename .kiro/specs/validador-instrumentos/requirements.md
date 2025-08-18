# Requirements Document

## Introduction

La aplicación "Validador de Instrumentos" es una herramienta web que permite a los usuarios cargar, categorizar y validar bases de datos de instrumentos educativos o de evaluación. La aplicación acepta archivos en formato XLSX o CSV, permite al usuario categorizar las variables mediante drag-and-drop en cuatro categorías principales (instrumento, identificador de ítem, metadata de ítem, y clasificación de ítem), realiza validaciones específicas para cada categoría, y genera reportes de validación junto con una base de datos normalizada con nombres de variables estandarizados.

## Requirements

### Requirement 1

**User Story:** Como usuario, quiero cargar archivos de bases de datos en formato XLSX o CSV, para poder validar la estructura y contenido de mis instrumentos.

#### Acceptance Criteria

1. WHEN el usuario selecciona un archivo XLSX THEN el sistema SHALL mostrar las hojas disponibles y permitir seleccionar una
2. WHEN el usuario selecciona un archivo CSV THEN el sistema SHALL cargar directamente el contenido
3. WHEN el archivo se carga exitosamente THEN el sistema SHALL mostrar las variables/columnas detectadas
4. IF el archivo tiene formato inválido THEN el sistema SHALL mostrar un mensaje de error descriptivo
5. WHEN el archivo se carga THEN el sistema SHALL asumir que cada fila representa un ítem

### Requirement 2

**User Story:** Como usuario, quiero categorizar las variables de mi base de datos mediante drag-and-drop, para que el sistema pueda aplicar las validaciones apropiadas a cada tipo de variable.

#### Acceptance Criteria

1. WHEN la base se carga THEN el sistema SHALL mostrar todas las variables en una lista arrastrable
2. WHEN el usuario arrastra una variable THEN el sistema SHALL permitir soltarla en una de las cuatro categorías: instrumento, identificador de ítem, metadata de ítem, clasificación de ítem
3. WHEN una variable se suelta en una categoría THEN el sistema SHALL moverla visualmente a esa categoría
4. WHEN una variable no es categorizada THEN el sistema SHALL automáticamente asignarla a "otras variables"
5. WHEN el usuario quiere reasignar una variable THEN el sistema SHALL permitir moverla entre categorías

### Requirement 3

**User Story:** Como usuario, quiero que el sistema valide automáticamente los duplicados en identificadores de ítems por instrumento, para asegurar la integridad de mis datos.

#### Acceptance Criteria

1. WHEN las variables de instrumento están definidas THEN el sistema SHALL identificar cada combinación única como un instrumento distinto
2. WHEN se ejecuta la validación THEN el sistema SHALL verificar que no existan identificadores de ítem duplicados dentro del mismo instrumento
3. IF existen duplicados THEN el sistema SHALL reportar qué ítems están duplicados y en qué instrumento
4. WHEN un ítem aparece en múltiples instrumentos THEN el sistema SHALL permitir esta situación (ítems ancla)

### Requirement 4

**User Story:** Como usuario, quiero que el sistema valide que todas las variables de metadata tengan valores completos, para asegurar que no falte información crítica de los ítems.

#### Acceptance Criteria

1. WHEN se ejecuta la validación de metadata THEN el sistema SHALL verificar que todas las celdas de variables de metadata tengan valores
2. IF existen celdas vacías en metadata THEN el sistema SHALL reportar qué variables y qué ítems tienen valores faltantes
3. WHEN se completa la validación THEN el sistema SHALL mostrar un resumen de los valores únicos encontrados en cada variable de metadata

### Requirement 5

**User Story:** Como usuario, quiero que el sistema analice las variables de clasificación de ítems, para entender la estructura y completitud de la clasificación de mis instrumentos.

#### Acceptance Criteria

1. WHEN se ejecuta la validación de clasificación THEN el sistema SHALL identificar celdas vacías en variables de clasificación
2. WHEN se completa el análisis THEN el sistema SHALL reportar cuántos valores únicos existen para cada variable de clasificación por instrumento
3. WHEN se genera el reporte THEN el sistema SHALL mostrar estadísticas de completitud para variables de clasificación
4. IF existen celdas vacías THEN el sistema SHALL reportarlas pero no marcarlas como error crítico

### Requirement 6

**User Story:** Como usuario, quiero recibir un reporte profesional y funcional de las validaciones, para poder tomar decisiones informadas sobre la calidad de mis datos.

#### Acceptance Criteria

1. WHEN se completan todas las validaciones THEN el sistema SHALL generar un reporte comprensivo
2. WHEN se genera el reporte THEN el sistema SHALL incluir secciones para cada tipo de validación (duplicados, metadata, clasificación)
3. WHEN se muestra el reporte THEN el sistema SHALL usar un formato profesional y fácil de leer
4. WHEN existen errores THEN el sistema SHALL destacarlos claramente con severidad apropiada
5. WHEN se genera el reporte THEN el sistema SHALL incluir estadísticas resumidas de la validación

### Requirement 7

**User Story:** Como usuario, quiero exportar una versión normalizada de mi base de datos con nombres de variables estandarizados, para tener un formato consistente para análisis posteriores.

#### Acceptance Criteria

1. WHEN se completa la categorización THEN el sistema SHALL generar nombres estandarizados para las variables
2. WHEN se exporta la base normalizada THEN el sistema SHALL usar nombres como var_instrumento1, id_item, var_metadata1, var_clasificacion1
3. WHEN se genera la exportación THEN el sistema SHALL mantener todos los datos originales con los nuevos nombres de columnas
4. WHEN el usuario solicita la exportación THEN el sistema SHALL permitir descargar en formato XLSX
5. WHEN se exporta THEN el sistema SHALL incluir una hoja adicional con el mapeo de nombres originales a nombres estandarizados

### Requirement 8

**User Story:** Como usuario, quiero una interfaz elegante, profesional y fácil de usar, para poder trabajar eficientemente con la aplicación.

#### Acceptance Criteria

1. WHEN el usuario accede a la aplicación THEN el sistema SHALL mostrar una interfaz limpia y profesional
2. WHEN el usuario interactúa con elementos drag-and-drop THEN el sistema SHALL proporcionar feedback visual claro
3. WHEN se muestran resultados THEN el sistema SHALL usar visualizaciones claras y organizadas
4. WHEN el usuario navega por la aplicación THEN el sistema SHALL mantener una experiencia intuitiva
5. WHEN se cargan archivos o procesan datos THEN el sistema SHALL mostrar indicadores de progreso apropiados

### Requirement 9

**User Story:** Como desarrollador, quiero que la aplicación esté construida con una arquitectura escalable, para poder añadir nuevas funcionalidades en el futuro.

#### Acceptance Criteria

1. WHEN se diseña la aplicación THEN el sistema SHALL usar una arquitectura modular
2. WHEN se implementan componentes THEN el sistema SHALL seguir principios de separación de responsabilidades
3. WHEN se estructura el código THEN el sistema SHALL permitir fácil extensión de funcionalidades
4. WHEN se seleccionan tecnologías THEN el sistema SHALL usar frameworks apropiados para aplicaciones web escalables
5. WHEN se implementa la lógica de negocio THEN el sistema SHALL ser independiente de la interfaz de usuario