# Plan de Implementación: Opciones Avanzadas de Validación (Ensamblaje)

## 📊 Estado del Proyecto

**Progreso General**: 46% completado (6 de 13 tareas principales)

### ✅ Completado (Backend Core):
- ✅ Modelo de datos extendido con 4 nuevos dataclasses
- ✅ Nuevo check de validación `check_advanced_constraints.py`
- ✅ Integración en validator como 5ta validación (opt-in)
- ✅ Endpoint `/detect-instruments` para pre-análisis

### 🔄 En Progreso:
- Ninguna tarea actualmente en progreso

### ⏳ Pendiente:
- Frontend completo (5 archivos)
- Reportes (Excel, PDF, Web)
- Testing y validación

**Próximo paso**: Continuar con Fase 3 - Frontend (interfaces TypeScript y modal)

---

## Resumen Ejecutivo

Implementar sistema de validación configurable que permite al usuario definir reglas estrictas sobre:
- **Cantidad exacta de ítems** por instrumento (para `item_id_vars`)
- **Validación de claves** (cardinalidad + valores permitidos) en variables críticas (para `metadata_vars`)

Sistema **opt-in**: funciona solo si el usuario configura opciones avanzadas, no afecta flujo actual.

---

## ✅ Fase 1: Extensión del Modelo de Datos (Backend) - COMPLETADO

### 1.1 Extender `models.py` con nuevas estructuras

**Archivo:** `backend/app/core/models.py`

**Agregar nuevos dataclasses (después de línea 16, antes de `VariableCategorization`):**

```python
@dataclass
class ItemCountConstraint:
    """Constraint sobre el número esperado de ítems por instrumento"""
    expected_count: int
    scope: str  # 'global' o clave de instrumento específico (ej: "Forma:A|Año:2023")

@dataclass
class KeyVariableConstraint:
    """Constraint para validación de variables de claves (cardinalidad + valores)"""
    variable_name: str
    expected_key_count: int
    expected_values: List[str]  # Valores permitidos (ej: ["A", "B", "C", "D"])
    scope: str  # 'global' o clave de instrumento específico

@dataclass
class AdvancedValidationOptions:
    """Opciones avanzadas de validación (OPT-IN)"""
    item_count_constraints: List[ItemCountConstraint] = field(default_factory=list)
    key_variable_constraints: List[KeyVariableConstraint] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'item_count_constraints': [
                {'expected_count': c.expected_count, 'scope': c.scope}
                for c in self.item_count_constraints
            ],
            'key_variable_constraints': [
                {
                    'variable_name': c.variable_name,
                    'expected_key_count': c.expected_key_count,
                    'expected_values': c.expected_values,
                    'scope': c.scope
                }
                for c in self.key_variable_constraints
            ]
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AdvancedValidationOptions':
        return cls(
            item_count_constraints=[
                ItemCountConstraint(**c)
                for c in data.get('item_count_constraints', [])
            ],
            key_variable_constraints=[
                KeyVariableConstraint(**c)
                for c in data.get('key_variable_constraints', [])
            ]
        )
```

**Modificar `VariableCategorization` (línea 18-45):**

```python
@dataclass
class VariableCategorization:
    """Categorization of variables by type"""
    instrument_vars: List[str] = field(default_factory=list)
    item_id_vars: List[str] = field(default_factory=list)
    metadata_vars: List[str] = field(default_factory=list)
    classification_vars: List[str] = field(default_factory=list)
    other_vars: List[str] = field(default_factory=list)
    advanced_options: Optional[AdvancedValidationOptions] = None  # NUEVO

    def to_dict(self) -> Dict[str, Any]:
        result = {
            'instrument_vars': self.instrument_vars,
            'item_id_vars': self.item_id_vars,
            'metadata_vars': self.metadata_vars,
            'classification_vars': self.classification_vars,
            'other_vars': self.other_vars
        }
        if self.advanced_options:
            result['advanced_options'] = self.advanced_options.to_dict()
        return result

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'VariableCategorization':
        advanced_opts = None
        if 'advanced_options' in data and data['advanced_options']:
            advanced_opts = AdvancedValidationOptions.from_dict(data['advanced_options'])

        return cls(
            instrument_vars=data.get('instrument_vars', []),
            item_id_vars=data.get('item_id_vars', []),
            metadata_vars=data.get('metadata_vars', []),
            classification_vars=data.get('classification_vars', []),
            other_vars=data.get('other_vars', []),
            advanced_options=advanced_opts
        )
```

**Agregar nuevo resultado de validación (después de línea 154):**

```python
@dataclass
class AdvancedConstraintsValidationResult(ValidationResult):
    """Resultado de validación de constraints avanzados (5ta validación, opt-in)"""
    item_count_violations: List[Dict[str, Any]] = field(default_factory=list)
    key_variable_violations: List[Dict[str, Any]] = field(default_factory=list)
    validation_parameters: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'is_valid': self.is_valid,
            'errors': [{'message': e.message, 'code': e.error_code, 'severity': e.severity, 'context': e.context} for e in self.errors],
            'warnings': [{'message': w.message, 'code': w.warning_code, 'context': w.context} for w in self.warnings],
            'statistics': self.statistics,
            'item_count_violations': self.item_count_violations,
            'key_variable_violations': self.key_variable_violations,
            'validation_parameters': self.validation_parameters
        }
```

**Extender `ValidationReport` (líneas 194-213):**

```python
@dataclass
class ValidationReport:
    """Complete validation report"""
    summary: ValidationSummary
    instrument_validation: InstrumentValidationResult
    duplicate_validation: DuplicateValidationResult
    metadata_validation: MetadataValidationResult
    classification_validation: ClassificationValidationResult
    advanced_validation: AdvancedConstraintsValidationResult  # NUEVO
    export_options: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'summary': self.summary.to_dict(),
            'instrument_validation': self.instrument_validation.to_dict(),
            'duplicate_validation': self.duplicate_validation.to_dict(),
            'metadata_validation': self.metadata_validation.to_dict(),
            'classification_validation': self.classification_validation.to_dict(),
            'advanced_validation': self.advanced_validation.to_dict(),  # NUEVO
            'export_options': self.export_options
        }
```

---

## ✅ Fase 2: Nuevo Check de Validación (Backend) - COMPLETADO

### 2.1 Crear `check_advanced_constraints.py`

**Archivo:** `backend/app/tools/ensamblaje_tool/checks/check_advanced_constraints.py` (NUEVO)

**Contenido completo:**

```python
"""
Check de validaciones avanzadas configurables por el usuario
Sistema OPT-IN: Solo se ejecuta si hay advanced_options configuradas
"""
import pandas as pd
from typing import Dict, List, Any
from ....core.models import (
    VariableCategorization,
    AdvancedConstraintsValidationResult,
    ItemCountConstraint,
    KeyVariableConstraint
)

def validate_advanced_constraints(
    data: pd.DataFrame,
    categorization: VariableCategorization
) -> AdvancedConstraintsValidationResult:
    """Validar constraints avanzados configurados por el usuario (OPT-IN)"""

    result = AdvancedConstraintsValidationResult(is_valid=True)

    # Sistema OPT-IN: Si no hay opciones avanzadas, retornar éxito
    if not categorization.advanced_options:
        result.validation_parameters = {
            'has_item_count_constraints': False,
            'has_key_variable_constraints': False
        }
        return result

    advanced_opts = categorization.advanced_options
    result.validation_parameters = {
        'has_item_count_constraints': len(advanced_opts.item_count_constraints) > 0,
        'has_key_variable_constraints': len(advanced_opts.key_variable_constraints) > 0
    }

    try:
        # Agrupar datos por instrumento
        instruments = _get_instruments(data, categorization)

        # 1. Validar constraints de conteo de ítems
        if advanced_opts.item_count_constraints:
            item_violations = _validate_item_counts(
                instruments, advanced_opts.item_count_constraints
            )
            result.item_count_violations = item_violations

            if item_violations:
                result.is_valid = False
                for v in item_violations:
                    result.add_error(v['message'], 'ITEM_COUNT_VIOLATION', 'error', **v['context'])

        # 2. Validar constraints de variables de claves
        if advanced_opts.key_variable_constraints:
            key_violations = _validate_key_variables(
                data, instruments, advanced_opts.key_variable_constraints
            )
            result.key_variable_violations = key_violations

            if key_violations:
                result.is_valid = False
                for v in key_violations:
                    result.add_error(v['message'], 'KEY_VARIABLE_VIOLATION', 'error', **v['context'])

        # Estadísticas
        result.statistics = {
            'total_constraints_checked': (
                len(advanced_opts.item_count_constraints) +
                len(advanced_opts.key_variable_constraints)
            ),
            'total_violations': (
                len(result.item_count_violations) +
                len(result.key_variable_violations)
            ),
            'instruments_analyzed': len(instruments)
        }

    except Exception as e:
        result.add_error(
            f"Error durante validación de constraints avanzados: {str(e)}",
            'ADVANCED_VALIDATION_ERROR',
            'error'
        )
        result.is_valid = False

    return result

def _validate_item_counts(
    instruments: Dict[str, pd.DataFrame],
    constraints: List[ItemCountConstraint]
) -> List[Dict[str, Any]]:
    """Validar conteo de ítems por instrumento"""
    violations = []

    for constraint in constraints:
        if constraint.scope == 'global':
            # Aplicar a todos los instrumentos
            for inst_key, inst_data in instruments.items():
                actual = len(inst_data)
                expected = constraint.expected_count
                if actual != expected:
                    display = _get_display_name(inst_key)
                    violations.append({
                        'message': f"Instrumento '{display}': se esperaban {expected} ítems, se encontraron {actual}",
                        'context': {
                            'instrument': inst_key,
                            'expected_count': expected,
                            'actual_count': actual,
                            'difference': actual - expected
                        }
                    })
        else:
            # Aplicar solo a instrumento específico
            if constraint.scope in instruments:
                inst_data = instruments[constraint.scope]
                actual = len(inst_data)
                expected = constraint.expected_count
                if actual != expected:
                    display = _get_display_name(constraint.scope)
                    violations.append({
                        'message': f"Instrumento '{display}': se esperaban {expected} ítems, se encontraron {actual}",
                        'context': {
                            'instrument': constraint.scope,
                            'expected_count': expected,
                            'actual_count': actual,
                            'difference': actual - expected
                        }
                    })

    return violations

def _validate_key_variables(
    data: pd.DataFrame,
    instruments: Dict[str, pd.DataFrame],
    constraints: List[KeyVariableConstraint]
) -> List[Dict[str, Any]]:
    """Validar cardinalidad y valores de variables de claves"""
    violations = []

    for constraint in constraints:
        var_name = constraint.variable_name

        if var_name not in data.columns:
            violations.append({
                'message': f"Variable de clave '{var_name}' no encontrada en datos",
                'context': {'variable': var_name}
            })
            continue

        if constraint.scope == 'global':
            # Aplicar a todos los instrumentos
            for inst_key, inst_data in instruments.items():
                violations.extend(_check_key_in_instrument(
                    inst_data, inst_key, var_name, constraint
                ))
        else:
            # Aplicar solo a instrumento específico
            if constraint.scope in instruments:
                violations.extend(_check_key_in_instrument(
                    instruments[constraint.scope], constraint.scope, var_name, constraint
                ))

    return violations

def _check_key_in_instrument(
    inst_data: pd.DataFrame,
    inst_key: str,
    var_name: str,
    constraint: KeyVariableConstraint
) -> List[Dict[str, Any]]:
    """Chequear variable de clave en un instrumento"""
    violations = []
    display = _get_display_name(inst_key)

    # Valores únicos (sin contar NaN)
    unique_vals = inst_data[var_name].dropna().unique()
    actual_count = len(unique_vals)
    expected_count = constraint.expected_key_count

    # 1. Validar cardinalidad
    if actual_count != expected_count:
        violations.append({
            'message': f"Instrumento '{display}', variable '{var_name}': se esperaban {expected_count} valores únicos, se encontraron {actual_count}",
            'context': {
                'instrument': inst_key,
                'variable': var_name,
                'expected_count': expected_count,
                'actual_count': actual_count,
                'actual_values': [str(v) for v in unique_vals]
            }
        })

    # 2. Validar valores permitidos
    if constraint.expected_values:
        expected_set = set(constraint.expected_values)
        actual_set = set(str(v) for v in unique_vals)

        unexpected = actual_set - expected_set
        missing = expected_set - actual_set

        if unexpected or missing:
            parts = [f"Instrumento '{display}', variable '{var_name}':"]
            if unexpected:
                parts.append(f"valores inesperados: {', '.join(unexpected)}")
            if missing:
                parts.append(f"valores faltantes: {', '.join(missing)}")

            violations.append({
                'message': ' '.join(parts),
                'context': {
                    'instrument': inst_key,
                    'variable': var_name,
                    'expected_values': constraint.expected_values,
                    'actual_values': [str(v) for v in unique_vals],
                    'unexpected_values': list(unexpected),
                    'missing_values': list(missing)
                }
            })

    return violations

def _get_instruments(data: pd.DataFrame, categorization: VariableCategorization) -> Dict[str, pd.DataFrame]:
    """Agrupar datos por instrumentos"""
    if not categorization.instrument_vars:
        return {'default_instrument': data}

    instruments = {}
    for _, row in data.iterrows():
        inst_vals = {var: str(row[var]) for var in categorization.instrument_vars if var in data.columns}
        inst_key = '|'.join([f"{k}:{v}" for k, v in sorted(inst_vals.items())])

        if inst_key not in instruments:
            instruments[inst_key] = []
        instruments[inst_key].append(row.to_dict())

    return {key: pd.DataFrame(rows) for key, rows in instruments.items()}

def _get_display_name(inst_key: str) -> str:
    """Crear nombre legible para instrumento"""
    if inst_key == 'default_instrument':
        return 'Toda la base de datos'
    return inst_key.replace('|', ' - ').replace(':', ': ')
```

### 2.2 Integrar en `validator.py`

**Archivo:** `backend/app/tools/ensamblaje_tool/validator.py`

**Modificar imports (línea 12-15):**

```python
from .checks.check_instruments import validate_instruments_identification
from ..common_checks.check_duplicates import validate_duplicates
from .checks.check_metadata import validate_metadata_completeness
from .checks.check_classification import analyze_classification_variables
from .checks.check_advanced_constraints import validate_advanced_constraints  # NUEVO
```

**Modificar imports de modelos (línea 8-11):**

```python
from ...core.models import (
    VariableCategorization, ValidationReport, ValidationSummary,
    InstrumentValidationResult, DuplicateValidationResult,
    MetadataValidationResult, ClassificationValidationResult,
    AdvancedConstraintsValidationResult  # NUEVO
)
```

**Modificar método `generate_comprehensive_report` (líneas 27-120):**

```python
def generate_comprehensive_report(
    self,
    data: pd.DataFrame,
    categorization: VariableCategorization
) -> ValidationReport:
    try:
        # Ejecutar checks (5 validaciones, la 5ta es opt-in)
        instrument_validation = validate_instruments_identification(data, categorization)
        duplicate_validation = validate_duplicates(data, categorization)
        metadata_validation = validate_metadata_completeness(data, categorization)
        classification_validation = analyze_classification_variables(data, categorization)
        advanced_validation = validate_advanced_constraints(data, categorization)  # NUEVO

        # Determinar estado general (incluir advanced_validation)
        has_errors = (
            not instrument_validation.is_valid or
            not duplicate_validation.is_valid or
            not metadata_validation.is_valid or
            not classification_validation.is_valid or
            not advanced_validation.is_valid  # NUEVO
        )

        has_warnings = (
            len(instrument_validation.warnings) > 0 or
            len(duplicate_validation.warnings) > 0 or
            len(metadata_validation.warnings) > 0 or
            len(classification_validation.warnings) > 0 or
            len(advanced_validation.warnings) > 0  # NUEVO
        )

        # ... resto del código de resumen ...

        # Crear reporte con advanced_validation
        report = ValidationReport(
            summary=summary,
            instrument_validation=instrument_validation,
            duplicate_validation=duplicate_validation,
            metadata_validation=metadata_validation,
            classification_validation=classification_validation,
            advanced_validation=advanced_validation,  # NUEVO
            export_options=[...]
        )

        return report

    except Exception as e:
        # En bloque de error, agregar advanced_validation vacío
        return ValidationReport(
            summary=summary,
            instrument_validation=InstrumentValidationResult(is_valid=False),
            duplicate_validation=error_validation,
            metadata_validation=MetadataValidationResult(is_valid=False),
            classification_validation=ClassificationValidationResult(is_valid=False),
            advanced_validation=AdvancedConstraintsValidationResult(is_valid=False)  # NUEVO
        )
```

---

## 🔄 Fase 3: Componente Frontend - Modal de Opciones Avanzadas - EN PROGRESO

### 3.1 Definir interfaces TypeScript - PENDIENTE

**Archivo:** `frontend/src/core/api.ts`

**Paso A: Agregar nuevas interfaces** (después de línea 76, antes de `export interface VariableCategorization`)

```typescript
export interface ItemCountConstraint {
  expected_count: number;
  scope: string; // 'global' | instrument key
}

export interface KeyVariableConstraint {
  variable_name: string;
  expected_key_count: number;
  expected_values: string[];
  scope: string; // 'global' | instrument key
}

export interface AdvancedValidationOptions {
  item_count_constraints: ItemCountConstraint[];
  key_variable_constraints: KeyVariableConstraint[];
}
```

**Paso B: Extender interfaz existente `VariableCategorization`** (líneas 78-84):

REEMPLAZAR:
```typescript
export interface VariableCategorization {
  instrument_vars: string[];
  item_id_vars: string[];
  metadata_vars: string[];
  classification_vars: string[];
  other_vars: string[];
}
```

POR:
```typescript
export interface VariableCategorization {
  instrument_vars: string[];
  item_id_vars: string[];
  metadata_vars: string[];
  classification_vars: string[];
  other_vars: string[];
  advanced_options?: AdvancedValidationOptions; // NUEVO - Opcional (opt-in)
}
```

**Paso C: Agregar interfaz para respuesta de detect-instruments** (después de ValidationResponse, línea 92):

```typescript
export interface DetectedInstrument {
  key: string;
  displayName: string;
  itemCount: number;
}

export interface DetectInstrumentsResponse {
  success: boolean;
  instruments: DetectedInstrument[];
}
```

**Paso D: Agregar método en ApiService** (después de línea 153, dentro de la clase ApiService):

```typescript
static async detectInstruments(uploadId: number, categorization: Partial<VariableCategorization>): Promise<DetectInstrumentsResponse> {
  const response = await axios.post(`/api/files/${uploadId}/detect-instruments`, categorization, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return response.data;
}
```

### 3.2 Crear `AdvancedOptionsModal.tsx` - PENDIENTE

**Archivo:** `frontend/src/tools/ensamblaje-validator/components/variable-categorization/AdvancedOptionsModal.tsx` (NUEVO)

**Características principales:**
- Tabs para separar configuración de `item_id_vars` y `metadata_vars`
- Para cada variable, selector de scope (Global / Por Instrumento)
- Pre-análisis de instrumentos: detectar combinaciones de `instrument_vars` en datos
- Para item_id_vars: TextField numérico para cantidad esperada
- Para metadata_vars:
  - Checkbox "¿Es variable de claves?"
  - TextField numérico para cantidad de claves
  - **ChipInput (MUI Autocomplete en modo freeSolo)** para valores esperados
- Validación de inputs antes de guardar
- Preview de configuración aplicada

**Estructura JSX:**

```tsx
<Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
  <DialogTitle>
    <Tune /> Opciones Avanzadas de Validación - {categoryType === 'item_id_vars' ? 'Identificación de Ítems' : 'Variables Críticas'}
  </DialogTitle>

  <DialogContent>
    <Alert severity="info">
      {categoryType === 'item_id_vars'
        ? 'Configure la cantidad exacta de ítems que debe tener cada instrumento'
        : 'Marque variables como "claves" y defina cuántos valores únicos deben tener y qué valores son válidos'}
    </Alert>

    {/* Si hay instrument_vars, mostrar info de instrumentos detectados */}
    {detectedInstruments.length > 1 && (
      <Box>
        <Typography>Instrumentos detectados: {detectedInstruments.length}</Typography>
        {/* Lista de instrumentos con su conteo actual de ítems */}
      </Box>
    )}

    {/* Por cada variable en la categoría */}
    {availableVariables.map(varName => (
      <Paper key={varName}>
        <Typography variant="h6">{varName}</Typography>

        {/* Selector de Scope */}
        <RadioGroup value={scopes[varName]}>
          <FormControlLabel value="global" label="Global (todos los instrumentos)" />
          {detectedInstruments.length > 1 && (
            <FormControlLabel value="specific" label="Específico por instrumento" />
          )}
        </RadioGroup>

        {scopes[varName] === 'specific' && (
          <Select>
            {detectedInstruments.map(inst => (
              <MenuItem value={inst.key}>{inst.displayName} ({inst.itemCount} ítems)</MenuItem>
            ))}
          </Select>
        )}

        {categoryType === 'item_id_vars' && (
          <TextField
            type="number"
            label="Cantidad esperada de ítems"
            value={itemCounts[varName]}
            onChange={...}
          />
        )}

        {categoryType === 'metadata_vars' && (
          <>
            <FormControlLabel
              control={<Checkbox checked={isKeyVariable[varName]} />}
              label="¿Es variable de claves?"
            />

            {isKeyVariable[varName] && (
              <>
                <TextField
                  type="number"
                  label="Número de claves esperadas"
                  value={keyCounts[varName]}
                />

                {/* ChipInput usando Autocomplete freeSolo */}
                <Autocomplete
                  multiple
                  freeSolo
                  options={[]}
                  value={expectedValues[varName] || []}
                  onChange={(e, newValue) => setExpectedValues({...expectedValues, [varName]: newValue})}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip label={option} {...getTagProps({ index })} />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="Valores esperados" placeholder="Escriba y presione Enter" />
                  )}
                />
              </>
            )}
          </>
        )}
      </Paper>
    ))}
  </DialogContent>

  <DialogActions>
    <Button onClick={onClose}>Cancelar</Button>
    <Button onClick={handleClearAll}>Limpiar Todo</Button>
    <Button variant="contained" onClick={handleSave}>Guardar</Button>
  </DialogActions>
</Dialog>
```

**Lógica de pre-análisis de instrumentos:**

```typescript
// Al abrir modal, detectar instrumentos en datos
const detectInstruments = async () => {
  if (!instrumentVariables.length) {
    setDetectedInstruments([{ key: 'global', displayName: 'Todos los instrumentos', itemCount: totalRows }]);
    return;
  }

  try {
    // Llamar a endpoint de detección con categorización actual
    const result = await ApiService.detectInstruments(uploadId, {
      instrument_vars: instrumentVariables
    });

    // result.instruments = [
    //   { key: 'Forma:A|Año:2023', displayName: 'Forma: A - Año: 2023', itemCount: 30 },
    //   { key: 'Forma:B|Año:2023', displayName: 'Forma: B - Año: 2023', itemCount: 25 }
    // ]
    setDetectedInstruments(result.instruments);
  } catch (error) {
    console.error('Error detecting instruments:', error);
    setDetectedInstruments([]);
  }
};
```

**Patrón de Autocomplete freeSolo para valores esperados:**

```typescript
import { Autocomplete, TextField, Chip } from '@mui/material';

// En el componente del modal:
<Autocomplete
  multiple
  freeSolo
  options={[]}  // Sin opciones predefinidas, permite entrada libre
  value={expectedValues[varName] || []}
  onChange={(event, newValue) => {
    // newValue es un array de strings
    setExpectedValues(prev => ({
      ...prev,
      [varName]: newValue
    }));
  }}
  renderTags={(value, getTagProps) =>
    value.map((option, index) => (
      <Chip
        label={option}
        {...getTagProps({ index })}
        color="primary"
        size="small"
      />
    ))
  }
  renderInput={(params) => (
    <TextField
      {...params}
      label="Valores esperados (presione Enter después de cada valor)"
      placeholder="Escriba un valor y presione Enter"
      helperText="Ejemplo: A, B, C, D"
    />
  )}
/>
```

### ✅ 3.3 Endpoint de detección de instrumentos (Backend) - COMPLETADO

**Archivo:** `backend/app/api/files.py` (agregar nuevo endpoint después de línea 235)

**Importaciones necesarias** (verificar que estén en el archivo, agregar si faltan):
```python
from app.core.services.file_handling.file_parser import FileParser
```

**Nuevo endpoint:**
```python
@bp.route('/<int:upload_id>/detect-instruments', methods=['POST'])
@require_session_ownership('upload')
def detect_instruments(upload_id):
    """
    Detectar instrumentos en datos para configuración de opciones avanzadas
    Pre-análisis que permite al usuario configurar constraints por instrumento específico
    """
    try:
        # Get database manager
        db = get_db_manager()

        # Get upload record
        upload_record = db.get_upload_record(upload_id)
        if not upload_record:
            return jsonify({
                'success': False,
                'error': 'Archivo no encontrado',
                'error_code': 'FILE_NOT_FOUND'
            }), 404

        # Check if file still exists
        if not os.path.exists(upload_record['file_path']):
            return jsonify({
                'success': False,
                'error': 'Archivo no disponible en el servidor',
                'error_code': 'FILE_NOT_AVAILABLE'
            }), 404

        # Get instrument_vars from request
        categorization_data = request.get_json()
        instrument_vars = categorization_data.get('instrument_vars', [])

        # Parse file using FileParser
        parser = FileParser()
        data = parser.parse_file(upload_record['file_path'], upload_record.get('sheet_name'))

        # If no instrument_vars, return single global instrument
        if not instrument_vars:
            return jsonify({
                'success': True,
                'instruments': [{
                    'key': 'global',
                    'displayName': 'Todos los instrumentos',
                    'itemCount': len(data)
                }]
            })

        # Agrupar por instrument_vars usando pandas groupby
        instruments = []

        try:
            grouped = data.groupby(instrument_vars, dropna=False)

            for name, group in grouped:
                # Manejar tanto tuplas (múltiples vars) como valores simples (una var)
                if isinstance(name, tuple):
                    key = '|'.join([f"{var}:{val}" for var, val in zip(instrument_vars, name)])
                    display = ' - '.join([f"{var}: {val}" for var, val in zip(instrument_vars, name)])
                else:
                    key = f"{instrument_vars[0]}:{name}"
                    display = f"{instrument_vars[0]}: {name}"

                instruments.append({
                    'key': key,
                    'displayName': display,
                    'itemCount': len(group)
                })

            return jsonify({
                'success': True,
                'instruments': instruments
            }), 200

        except KeyError as e:
            return jsonify({
                'success': False,
                'error': f'Variable de instrumento no encontrada: {str(e)}',
                'error_code': 'INSTRUMENT_VAR_NOT_FOUND'
            }), 400

    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error al detectar instrumentos: {str(e)}',
            'error_code': 'DETECT_INSTRUMENTS_ERROR'
        }), 500
```

### 3.4 Integrar modal en `VariableCategorization.tsx` - PENDIENTE

**Archivo:** `frontend/src/tools/ensamblaje-validator/components/VariableCategorization.tsx`

**Agregar estado (después de línea 67):**

```typescript
const [advancedOptions, setAdvancedOptions] = useState<AdvancedValidationOptions | null>(null);
const [showAdvancedModal, setShowAdvancedModal] = useState(false);
const [advancedModalCategory, setAdvancedModalCategory] = useState<'item_id_vars' | 'metadata_vars' | null>(null);
```

**Agregar handlers:**

```typescript
const handleOpenAdvancedOptions = (categoryType: 'item_id_vars' | 'metadata_vars') => {
  setAdvancedModalCategory(categoryType);
  setShowAdvancedModal(true);
};

const handleSaveAdvancedOptions = (options: AdvancedValidationOptions) => {
  setAdvancedOptions(options);
  setShowAdvancedModal(false);
};
```

**Incluir en payload de categorización (modificar función `proceedWithCategorization`):**

```typescript
const categorizationData = {
  instrument_vars: categorizedVariables.instrument_vars.map(v => v.name),
  item_id_vars: categorizedVariables.item_id_vars.map(v => v.name),
  metadata_vars: categorizedVariables.metadata_vars.map(v => v.name),
  classification_vars: categorizedVariables.classification_vars.map(v => v.name),
  other_vars: [...categorizedVariables.other_vars.map(v => v.name), ...uncategorizedVariables.map(v => v.name)],
  ...(advancedOptions && { advanced_options: advancedOptions })  // NUEVO
};
```

**Renderizar modal:**

```tsx
<AdvancedOptionsModal
  open={showAdvancedModal}
  onClose={() => setShowAdvancedModal(false)}
  onSave={handleSaveAdvancedOptions}
  categoryType={advancedModalCategory}
  availableVariables={
    advancedModalCategory === 'item_id_vars'
      ? categorizedVariables.item_id_vars.map(v => v.name)
      : categorizedVariables.metadata_vars.map(v => v.name)
  }
  currentOptions={advancedOptions}
  instrumentVariables={categorizedVariables.instrument_vars.map(v => v.name)}
  uploadId={uploadId}
/>
```

### 3.5 Modificar `CategoryDropZones.tsx` - PENDIENTE

**Archivo:** `frontend/src/tools/ensamblaje-validator/components/variable-categorization/CategoryDropZones.tsx`

**Agregar prop (después de línea 20):**

```typescript
interface CategoryDropZonesProps {
  categorizedVariables: Record<string, Variable[]>;
  onDrop: (categoryId: string, variable: Variable) => void;
  onRemove: (categoryId: string, variableName: string) => void;
  onOpenAdvancedOptions?: (categoryType: 'item_id_vars' | 'metadata_vars') => void;  // NUEVO
  advancedOptionsConfigured?: { item_id_vars: boolean; metadata_vars: boolean };  // NUEVO
}
```

**Renderizar botón en header (en el render de cada categoría, después del ícono):**

```tsx
{(category.id === 'item_id_vars' || category.id === 'metadata_vars') && (
  <Tooltip title="Opciones avanzadas de validación">
    <IconButton
      size="small"
      onClick={(e) => {
        e.stopPropagation();
        onOpenAdvancedOptions?.(category.id);
      }}
      disabled={categorizedVariables[category.id].length === 0}
      sx={{ ml: 'auto' }}
    >
      <Tune fontSize="small" />
      {advancedOptionsConfigured?.[category.id] && (
        <Badge color="primary" variant="dot" sx={{ position: 'absolute', top: 4, right: 4 }} />
      )}
    </IconButton>
  </Tooltip>
)}
```

---

## 🔄 Fase 4: Integración con Reportes - PENDIENTE

### 4.1 Reporte Web - `ValidationReport.jsx` - PENDIENTE

**Archivo:** `frontend/src/tools/ensamblaje-validator/components/ValidationReport.jsx`

**Agregar nueva sección de acordeón (después de classification_validation, antes de botones de exportación):**

```jsx
{/* Solo mostrar si hay advanced_validation con constraints configurados */}
{validationData.advanced_validation?.validation_parameters?.has_item_count_constraints ||
 validationData.advanced_validation?.validation_parameters?.has_key_variable_constraints ? (
  <Accordion expanded={expandedSections.includes('advanced')} onChange={() => handleSectionToggle('advanced')}>
    <AccordionSummary expandIcon={<ExpandMore />}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
        <Tune />
        <Typography variant="h6">Validación - Opciones Avanzadas</Typography>
        <Chip
          label={validationData.advanced_validation.is_valid ? 'VÁLIDO' : 'ERRORES ENCONTRADOS'}
          color={validationData.advanced_validation.is_valid ? 'success' : 'error'}
          size="small"
        />
      </Box>
    </AccordionSummary>

    <AccordionDetails>
      {/* Tabla de violaciones de conteo de ítems */}
      {validationData.advanced_validation.item_count_violations?.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>📊 Violaciones de Conteo de Ítems</Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Instrumento</TableCell>
                  <TableCell align="right">Esperado</TableCell>
                  <TableCell align="right">Encontrado</TableCell>
                  <TableCell align="right">Diferencia</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {validationData.advanced_validation.item_count_violations.map((v, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{v.context.instrument}</TableCell>
                    <TableCell align="right">{v.context.expected_count}</TableCell>
                    <TableCell align="right">{v.context.actual_count}</TableCell>
                    <TableCell align="right">
                      <Chip
                        label={v.context.difference > 0 ? `+${v.context.difference}` : v.context.difference}
                        color={v.context.difference === 0 ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Alerts de violaciones de variables de claves */}
      {validationData.advanced_validation.key_variable_violations?.length > 0 && (
        <Box>
          <Typography variant="subtitle1" gutterBottom>🔑 Violaciones de Variables de Claves</Typography>
          {validationData.advanced_validation.key_variable_violations.map((v, idx) => (
            <Alert severity="error" key={idx} sx={{ mb: 1 }}>
              <AlertTitle>{v.context.variable} en {v.context.instrument}</AlertTitle>
              <Typography variant="body2">{v.message}</Typography>
              {v.context.unexpected_values?.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption">Valores inesperados:</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                    {v.context.unexpected_values.map(val => (
                      <Chip key={val} label={val} size="small" color="error" variant="outlined" />
                    ))}
                  </Box>
                </Box>
              )}
              {v.context.missing_values?.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption">Valores faltantes:</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                    {v.context.missing_values.map(val => (
                      <Chip key={val} label={val} size="small" color="warning" variant="outlined" />
                    ))}
                  </Box>
                </Box>
              )}
            </Alert>
          ))}
        </Box>
      )}

      {/* Mensaje de éxito */}
      {validationData.advanced_validation.is_valid && (
        <Alert severity="success">
          ✅ Todas las opciones avanzadas de validación se cumplieron exitosamente
        </Alert>
      )}
    </AccordionDetails>
  </Accordion>
) : null}
```

### 4.2 Reporte Excel - `validation_excel_exporter.py` - PENDIENTE

**Archivo:** `backend/app/tools/ensamblaje_tool/export_formats/validation_excel_exporter.py`

**CONCEPTO CORRECTO**: El Excel usa un mapa `cell_problems` donde cada variable tiene sus problemas por fila. **NO se crea columna `val_advanced`**, sino que se **agregan problemas al mapa de la variable correspondiente**.

**Modificar método `_build_cell_problems_map` (agregar después de sección 3, línea ~216):**

```python
def _build_cell_problems_map(...):
    """..."""
    problems = {}

    # ... Secciones 1-3 existentes (duplicados, metadata, instrument_vars) ...

    # NUEVO: 4. Validaciones avanzadas - Variables de claves
    if categorization.advanced_options and categorization.advanced_options.key_variable_constraints:
        for constraint in categorization.advanced_options.key_variable_constraints:
            var_name = constraint.variable_name

            if var_name not in data.columns:
                continue

            if var_name not in problems:
                problems[var_name] = {}

            # Determinar qué filas validar según scope
            if constraint.scope == 'global':
                target_data = data
            else:
                # Crear máscara para instrumento específico
                inst_values = dict(part.split(':', 1) for part in constraint.scope.split('|'))
                mask = pd.Series([True] * len(data), index=data.index)
                for ivar, ival in inst_values.items():
                    if ivar in data.columns:
                        mask &= (data[ivar].astype(str) == ival)
                target_data = data[mask]

            # Validar valores esperados
            if constraint.expected_values:
                expected_set = set(constraint.expected_values)

                for idx in target_data.index:
                    val = str(target_data.loc[idx, var_name])
                    if pd.notna(target_data.loc[idx, var_name]) and val not in expected_set:
                        # Agregar problema a la variable correspondiente
                        if idx in problems[var_name]:
                            problems[var_name][idx] = f"{problems[var_name][idx]}+KEY_UNEXPECTED"
                        else:
                            problems[var_name][idx] = 'KEY_UNEXPECTED'

    return problems
```

**Nota**: Las violaciones de conteo de ítems NO se marcan en el Excel porque son a nivel de instrumento, no de celda individual.

**Modificar `_create_validation_summary_sheet` (agregar en sección de resumen, línea ~450):**

```python
# NUEVO: Sección de Opciones Avanzadas (solo si configuradas)
if validation_results.get('advanced_validation'):
    advanced = validation_results['advanced_validation']
    params = advanced.get('validation_parameters', {})

    if params.get('has_item_count_constraints') or params.get('has_key_variable_constraints'):
        summary_info.append(['', ''])
        summary_info.append(['VALIDACIONES AVANZADAS', ''])
        summary_info.append(['Estado', 'VÁLIDO ✓' if advanced['is_valid'] else 'ERRORES ✗'])

        if advanced.get('item_count_violations'):
            summary_info.append(['Violaciones de conteo de ítems', len(advanced['item_count_violations'])])

        if advanced.get('key_variable_violations'):
            summary_info.append(['Violaciones de variables de claves', len(advanced['key_variable_violations'])])
```

**NO se requieren cambios en `_apply_excel_formatting`** - El sistema existente ya colorea automáticamente las celdas con problemas según el mapa.

### 4.3 Reporte PDF - `pdf_report_exporter.py` - PENDIENTE

**Archivo:** `backend/app/tools/ensamblaje_tool/export_formats/pdf_report_exporter.py`

**CONCEPTO CORRECTO**: Integrar validaciones avanzadas EN LAS SECCIONES EXISTENTES:
- **Conteo de ítems** → Sección 4 (Validación de Duplicados)
- **Variables de claves** → Sección 5 (Validación de Información Crítica)

**NO crear sección 11 separada. NO modificar tabla de contenidos.**

**Modificar `_create_duplicate_validation_section` (agregar al final del método, antes del return):**

```python
def _create_duplicate_validation_section(self, validation_data: Dict) -> List:
    """..."""
    story = []

    # ... código existente ...

    # NUEVO: Agregar subsección de conteo de ítems (si configurada)
    advanced = validation_data.get('advanced_validation', {})
    if advanced.get('item_count_violations'):
        story.append(Spacer(1, 0.3*inch))
        story.append(Paragraph('4.X Validación de Conteo Exacto de Ítems', self.styles['Heading2']))
        story.append(Spacer(1, 0.1*inch))

        story.append(Paragraph(
            'Reglas configuradas para verificar cantidad exacta de ítems por instrumento.',
            self.styles['Body']
        ))
        story.append(Spacer(1, 0.1*inch))

        table_data = [['Instrumento', 'Esperado', 'Encontrado', 'Diferencia']]
        for v in advanced['item_count_violations']:
            ctx = v['context']
            table_data.append([
                Paragraph(ctx['instrument'], self.styles['BodySmall']),
                str(ctx['expected_count']),
                str(ctx['actual_count']),
                f"{ctx['difference']:+d}"
            ])

        table = Table(table_data, colWidths=[3*inch, 1.5*inch, 1.5*inch, 1.5*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), BRAND_COLORS['primary']),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey])
        ]))
        story.append(table)

    return story
```

**Modificar `_create_metadata_validation_section` (agregar al final del método, antes del return):**

```python
def _create_metadata_validation_section(self, validation_data: Dict) -> List:
    """..."""
    story = []

    # ... código existente ...

    # NUEVO: Agregar subsección de variables de claves (si configurada)
    advanced = validation_data.get('advanced_validation', {})
    if advanced.get('key_variable_violations'):
        story.append(Spacer(1, 0.3*inch))
        story.append(Paragraph('5.X Validación de Variables de Claves', self.styles['Heading2']))
        story.append(Spacer(1, 0.1*inch))

        story.append(Paragraph(
            'Reglas configuradas para verificar cardinalidad y valores permitidos en variables críticas.',
            self.styles['Body']
        ))
        story.append(Spacer(1, 0.1*inch))

        for v in advanced['key_variable_violations']:
            ctx = v['context']
            story.append(Paragraph(
                f"<b>Variable:</b> {ctx['variable']} | <b>Instrumento:</b> {ctx['instrument']}",
                self.styles['Body']
            ))
            story.append(Paragraph(f"<i>{v['message']}</i>", self.styles['BodySmall']))

            if ctx.get('unexpected_values'):
                story.append(Paragraph(
                    f"Valores inesperados: {', '.join(ctx['unexpected_values'])}",
                    self.styles['BodySmall']
                ))
            if ctx.get('missing_values'):
                story.append(Paragraph(
                    f"Valores faltantes: {', '.join(ctx['missing_values'])}",
                    self.styles['BodySmall']
                ))
            story.append(Spacer(1, 0.1*inch))

    return story
```

---

## 🔄 Fase 5: Testing y Validación - PENDIENTE

### 5.1 Casos de prueba principales

1. **Sin opciones avanzadas (compatibilidad retroactiva):**
   - Validar que todo funciona como antes
   - `advanced_validation` debe retornar `is_valid=True` y sin violaciones

2. **Constraint global de conteo de ítems:**
   - Todos los instrumentos deben tener 30 ítems
   - Uno tiene 28 → debe marcar violación

3. **Constraint específico de conteo:**
   - Solo "Forma A" debe tener 25 ítems
   - Otros instrumentos no validados

4. **Variable de claves con cardinalidad:**
   - Variable "Clave" debe tener 4 valores únicos
   - Tiene 5 → violación

5. **Variable de claves con valores permitidos:**
   - Variable "Clave" debe ser solo A, B, C, D
   - Aparece "E" → violación (unexpected)
   - Falta "D" → violación (missing)

6. **Combinación de constraints:**
   - Item count global + key variable específica
   - Validar que ambos se evalúan correctamente

### 5.2 Puntos de validación

- [ ] Modelo de datos serializa/deserializa correctamente
- [ ] Check de advanced_constraints funciona con datos reales
- [ ] Modal se abre y detecta instrumentos correctamente
- [ ] ChipInput permite agregar/quitar valores
- [ ] Configuración se guarda en BD con categorización
- [ ] Validación ejecuta y genera violaciones correctas
- [ ] Reporte web muestra sección de advanced_validation
- [ ] Excel agrega problemas al mapa `cell_problems` correctamente
- [ ] PDF integra subsecciones en Secciones 4 y 5
- [ ] Sistema es verdaderamente opt-in (no rompe casos sin configuración)

---

## Estado de Archivos Críticos

**Backend:**
1. ✅ `backend/app/core/models.py` - Extendido con nuevos dataclasses - **COMPLETADO**
2. ✅ `backend/app/tools/ensamblaje_tool/checks/check_advanced_constraints.py` - NUEVO check creado - **COMPLETADO**
3. ✅ `backend/app/tools/ensamblaje_tool/validator.py` - Check integrado en orquestador - **COMPLETADO**
4. ✅ `backend/app/api/files.py` - NUEVO endpoint `/detect-instruments` creado - **COMPLETADO**
5. 🔄 `backend/app/tools/ensamblaje_tool/export_formats/validation_excel_exporter.py` - **PENDIENTE**
6. 🔄 `backend/app/tools/ensamblaje_tool/export_formats/pdf_report_exporter.py` - **PENDIENTE**

**Frontend:**
7. 🔄 `frontend/src/core/api.ts` - **PENDIENTE** - Agregar interfaces TypeScript
8. 🔄 `frontend/src/tools/ensamblaje-validator/components/variable-categorization/AdvancedOptionsModal.tsx` - **PENDIENTE** - NUEVO modal
9. 🔄 `frontend/src/tools/ensamblaje-validator/components/VariableCategorization.tsx` - **PENDIENTE** - Integrar modal
10. 🔄 `frontend/src/tools/ensamblaje-validator/components/variable-categorization/CategoryDropZones.tsx` - **PENDIENTE** - Agregar botón
11. 🔄 `frontend/src/tools/ensamblaje-validator/components/ValidationReport.jsx` - **PENDIENTE** - Agregar sección

---

## Orden de Implementación Recomendado

1. ✅ **Backend - Modelo de datos** (Fase 1): Establece la base para todo - **COMPLETADO**
2. ✅ **Backend - Check de validación** (Fase 2): Lógica de negocio independiente - **COMPLETADO**
3. ✅ **Backend - Endpoint de detección** (3.3): Necesario para el modal - **COMPLETADO**
4. 🔄 **Frontend - Interfaces TypeScript** (Fase 3.1): Definir tipos - **PENDIENTE**
5. 🔄 **Frontend - Modal** (Fase 3.2): Componente principal de configuración - **PENDIENTE**
6. 🔄 **Frontend - Integración** (Fase 3.4-3.5): Conectar modal con categorización - **PENDIENTE**
7. 🔄 **Reportes Web** (Fase 4.1): Acordeón de validación avanzada - **PENDIENTE**
8. 🔄 **Reportes Excel** (Fase 4.2): Agregar KEY_UNEXPECTED al mapa - **PENDIENTE**
9. 🔄 **Reportes PDF** (Fase 4.3): Subsecciones en Secciones 4 y 5 - **PENDIENTE**
10. 🔄 **Testing** (Fase 5): Validación completa del flujo - **PENDIENTE**

---

## Consideraciones de UX

- **Indicador visual**: Badge en botón "Opciones Avanzadas" cuando hay configuración
- **Pre-análisis**: Mostrar conteo actual de ítems por instrumento para facilitar configuración
- **Validación de inputs**: No permitir guardar si faltan campos requeridos
- **Mensajes claros**: Violaciones deben indicar exactamente qué esperaba vs qué encontró
- **Opt-in verdadero**: Usuario NO ve complejidad extra si no usa feature
- **Editable**: Usuario puede re-abrir modal y modificar configuración antes de re-validar

---

## Validación de Coherencia Arquitectónica

### Integración con Patrones Existentes ✅

1. **Modelo de datos (Backend)**:
   - Extensión de `VariableCategorization` con campo opcional `advanced_options`
   - Uso de `@dataclass` consistente con otros modelos en `models.py`
   - Serialización con `to_dict()` / `from_dict()` siguiendo patrón existente
   - Almacenamiento en `categorization_json` (TEXT en SQLite) sin cambios de esquema

2. **Check de validación (Backend)**:
   - Nuevo archivo `check_advanced_constraints.py` en directorio `checks/`
   - Función principal `validate_advanced_constraints()` con misma firma que otros checks
   - Retorna `AdvancedConstraintsValidationResult` (subclase de `ValidationResult`)
   - Integración en `validator.py` como 5ta validación, misma estructura que las 4 existentes

3. **Endpoint API (Backend)**:
   - Patrón `@bp.route('/<int:upload_id>/...')` consistente con otros endpoints en `files.py`
   - Decorador `@require_session_ownership('upload')` para seguridad
   - Retorno `jsonify({'success': True/False, ...})` siguiendo convención
   - Manejo de errores con códigos de error específicos

4. **ApiService (Frontend)**:
   - Método estático `detectInstruments()` con misma estructura que `parseFile()`, `saveCategorization()`, etc.
   - Uso de axios con headers `Content-Type: application/json`
   - Retorno de `response.data` directamente

5. **Modal de UI (Frontend)**:
   - Patrón de Dialog de MUI consistente con `UserCategorizationReplicationDialog`
   - Props con `open`, `onClose`, `onSave` siguiendo convención
   - Uso de componentes MUI (`Autocomplete`, `TextField`, `Chip`) ya presentes en el proyecto

6. **Reportes**:
   - Excel: Agregar problemas al mapa `cell_problems` de cada variable con KEY_UNEXPECTED
   - PDF: Subsecciones integradas en Secciones 4 y 5 (Duplicados y Metadata)
   - Web: Acordeón nuevo con estructura idéntica a acordeones de otras validaciones

### Manejo de Estado y Persistencia ✅

1. **Persistencia en BD**:
   - `categorization_json` en `validation_sessions` almacena todo el diccionario de categorización
   - `advanced_options` se incluye automáticamente al serializar con `to_dict()`
   - No requiere migración de esquema (campo TEXT puede contener JSON con o sin advanced_options)

2. **Deserialización**:
   - `VariableCategorization.from_dict()` maneja campo opcional `advanced_options`
   - Si no está presente en JSON, `advanced_options` es `None` (comportamiento opt-in)
   - Conversión de diccionario a `AdvancedValidationOptions` usando `from_dict()`

3. **Estado temporal en frontend**:
   - Estado local `advancedOptions` en `VariableCategorization.tsx`
   - Se incluye en payload al guardar categorización (spread operator `...`)
   - Persistencia en contexto global siguiendo patrón de `currentCategorization`

### Consideraciones Críticas de Invalidación

**Problema**: ¿Qué pasa si el usuario cambia las `instrument_vars` después de configurar opciones avanzadas específicas por instrumento?

**Solución**: Detección y advertencia

1. **Detectar cambio en instrument_vars**:
```typescript
// En VariableCategorization.tsx
useEffect(() => {
  if (advancedOptions && hasInstrumentSpecificConstraints(advancedOptions)) {
    // Verificar si instrument_vars han cambiado
    const currentInstrumentVars = categorizedVariables.instrument_vars.map(v => v.name);
    const previousInstrumentVars = lastInstrumentVarsWhenConfigured.current;

    if (!arraysEqual(currentInstrumentVars, previousInstrumentVars)) {
      // Mostrar advertencia
      setShowInvalidationWarning(true);
    }
  }
}, [categorizedVariables.instrument_vars, advancedOptions]);
```

2. **Opciones para el usuario**:
   - Mantener opciones avanzadas (pueden no aplicar correctamente)
   - Limpiar opciones avanzadas y reconfigurar
   - Re-abrir modal para ajustar

3. **Alternativa más simple** (recomendada para MVP):
   - **Limpiar automáticamente** las opciones avanzadas específicas por instrumento cuando cambien las instrument_vars
   - Mantener solo las opciones globales (no dependen de instrumentos específicos)
   - Mostrar Snackbar informativo: "Las opciones avanzadas específicas por instrumento se han limpiado debido a cambios en las variables de instrumento"

### Gestión de Errores

1. **Endpoint detect-instruments**:
   - Manejo estándar de archivo no encontrado (404)
   - Las variables de instrumento siempre existen (usuario las seleccionó del archivo)

2. **Validación backend**:
   - Try-catch general en `validate_advanced_constraints()` para errores inesperados
   - Sistema modular: un error en advanced constraints no interrumpe otras validaciones

### Rendimiento y Escalabilidad

1. **Endpoint detect-instruments**:
   - Carga archivo completo en memoria (mismo patrón que parse)
   - Para archivos muy grandes (>100MB), puede ser lento
   - **Mitigación**: Se ejecuta solo una vez al abrir modal (no en cada cambio)
   - **Optimización futura**: Usar muestreo para archivos grandes

2. **Validación de constraints**:
   - Agrupamiento por instrumentos ya se hace en otras validaciones (código compartido potencial)
   - Para bases con muchos instrumentos, iterar por cada constraint puede ser O(n*m)
   - **Mitigación**: Constraints típicamente son pocos (2-5 por categoría)

3. **Exportes**:
   - Agregar problemas al mapa no agrega sobrecarga (sistema existente)
   - PDF agrega subsecciones a secciones existentes, no afecta significativamente tiempo de generación
