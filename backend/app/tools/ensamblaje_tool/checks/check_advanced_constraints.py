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
            item_errors, item_passed = _validate_item_counts(
                instruments, advanced_opts.item_count_constraints
            )
            result.item_count_errors = item_errors
            result.item_count_passed = item_passed

            if item_errors:
                result.is_valid = False
                for v in item_errors:
                    result.add_error(v['message'], 'ITEM_COUNT_ERROR', 'error', **v['context'])

        # 2. Validar constraints de variables de claves
        if advanced_opts.key_variable_constraints:
            key_errors, key_passed = _validate_key_variables(
                data, instruments, advanced_opts.key_variable_constraints
            )
            result.key_variable_errors = key_errors
            result.key_variable_passed = key_passed

            if key_errors:
                result.is_valid = False
                for v in key_errors:
                    result.add_error(v['message'], 'KEY_VARIABLE_ERROR', 'error', **v['context'])

        # Estadísticas
        result.statistics = {
            'total_constraints_checked': (
                len(advanced_opts.item_count_constraints) +
                len(advanced_opts.key_variable_constraints)
            ),
            'total_errors': (
                len(result.item_count_errors) +
                len(result.key_variable_errors)
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
) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Validar conteo de ítems por instrumento. Retorna (errores, pasados)"""
    errors = []
    passed = []

    for constraint in constraints:
        if constraint.scope == 'global':
            # Aplicar a todos los instrumentos
            for inst_key, inst_data in instruments.items():
                actual = len(inst_data)
                expected = constraint.expected_count
                display = _get_display_name(inst_key)

                if actual != expected:
                    errors.append({
                        'message': f"Instrumento '{display}': se esperaban {expected} ítems, se encontraron {actual}",
                        'context': {
                            'instrument': inst_key,
                            'expected_count': expected,
                            'actual_count': actual,
                            'difference': actual - expected
                        }
                    })
                else:
                    passed.append({
                        'instrument': inst_key,
                        'instrument_display': display,
                        'expected_count': expected,
                        'actual_count': actual
                    })
        else:
            # Aplicar solo a instrumento específico
            if constraint.scope in instruments:
                inst_data = instruments[constraint.scope]
                actual = len(inst_data)
                expected = constraint.expected_count
                display = _get_display_name(constraint.scope)

                if actual != expected:
                    errors.append({
                        'message': f"Instrumento '{display}': se esperaban {expected} ítems, se encontraron {actual}",
                        'context': {
                            'instrument': constraint.scope,
                            'expected_count': expected,
                            'actual_count': actual,
                            'difference': actual - expected
                        }
                    })
                else:
                    passed.append({
                        'instrument': constraint.scope,
                        'instrument_display': display,
                        'expected_count': expected,
                        'actual_count': actual
                    })

    return errors, passed

def _validate_key_variables(
    data: pd.DataFrame,
    instruments: Dict[str, pd.DataFrame],
    constraints: List[KeyVariableConstraint]
) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Validar cardinalidad y valores de variables de claves. Retorna (errores, pasados)"""
    errors = []
    passed = []

    for constraint in constraints:
        var_name = constraint.variable_name

        if var_name not in data.columns:
            errors.append({
                'message': f"Variable de clave '{var_name}' no encontrada en datos",
                'context': {'variable': var_name}
            })
            continue

        if constraint.scope == 'global':
            # Aplicar a todos los instrumentos
            for inst_key, inst_data in instruments.items():
                inst_errors, inst_passed = _check_key_in_instrument(
                    inst_data, inst_key, var_name, constraint
                )
                errors.extend(inst_errors)
                if inst_passed:
                    passed.append(inst_passed)
        else:
            # Aplicar solo a instrumento específico
            if constraint.scope in instruments:
                inst_errors, inst_passed = _check_key_in_instrument(
                    instruments[constraint.scope], constraint.scope, var_name, constraint
                )
                errors.extend(inst_errors)
                if inst_passed:
                    passed.append(inst_passed)

    return errors, passed

def _check_key_in_instrument(
    inst_data: pd.DataFrame,
    inst_key: str,
    var_name: str,
    constraint: KeyVariableConstraint
) -> tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """Chequear variable de clave en un instrumento. Retorna (errores, pasado)"""
    errors = []
    display = _get_display_name(inst_key)

    # Valores únicos (sin contar NaN)
    unique_vals = inst_data[var_name].dropna().unique()
    actual_count = len(unique_vals)
    expected_count = constraint.expected_key_count

    # Determinar qué validaciones se deben ejecutar
    should_check_cardinality = expected_count > 0
    should_check_values = constraint.expected_values and len(constraint.expected_values) > 0

    # Flags de validación (inicializar en False, solo marcar True si pasan)
    cardinality_ok = not should_check_cardinality  # True si no se debe validar
    values_ok = not should_check_values  # True si no se debe validar

    # Normalizar valores para comparación (manejar números como 4 vs 4.0)
    def normalize_value(val):
        s = str(val)
        try:
            # Si es numérico, convertir a float y luego a int si no tiene decimales
            num = float(s)
            if num.is_integer():
                return str(int(num))
            return s
        except (ValueError, AttributeError):
            return s

    # Normalizar valores únicos encontrados
    normalized_actual = [normalize_value(v) for v in unique_vals]

    # 1. Validar cardinalidad (solo si expected_count > 0)
    if should_check_cardinality:
        if actual_count == expected_count:
            cardinality_ok = True
        else:
            cardinality_ok = False

    # 2. Validar valores permitidos (solo si se especificaron)
    expected_set = set()
    actual_set = set()
    unexpected = set()
    missing = set()
    matched = set()

    if should_check_values:
        expected_set = set(normalize_value(v) for v in constraint.expected_values)
        actual_set = set(normalized_actual)

        unexpected = actual_set - expected_set
        missing = expected_set - actual_set
        matched = expected_set & actual_set

        if unexpected or missing:
            values_ok = False
        else:
            # Los valores coinciden exactamente
            values_ok = True

    # Consolidar en un solo error si hay problemas
    if not cardinality_ok or not values_ok:
        parts = []

        if not cardinality_ok:
            parts.append(f"se esperaban {expected_count} valores únicos, se encontraron {actual_count}")

        if not values_ok:
            if unexpected:
                parts.append(f"valores inesperados: {', '.join(sorted(unexpected))}")
            if missing:
                parts.append(f"valores faltantes: {', '.join(sorted(missing))}")

        message = f"Instrumento '{display}', variable '{var_name}': {'; '.join(parts)}"

        errors.append({
            'message': message,
            'context': {
                'instrument': inst_key,
                'variable': var_name,
                'expected_count': expected_count if should_check_cardinality else None,
                'actual_count': actual_count,
                'expected_values': list(expected_set) if should_check_values else None,
                'actual_values': normalized_actual,
                'matched_values': list(matched) if should_check_values else None,
                'unexpected_values': list(unexpected) if should_check_values else None,
                'missing_values': list(missing) if should_check_values else None
            }
        })

    # Solo marcar como passed si se configuró al menos una validación y todas pasaron
    passed = None
    has_any_validation = should_check_cardinality or should_check_values

    if has_any_validation and cardinality_ok and values_ok:
        passed = {
            'instrument': inst_key,
            'instrument_display': display,
            'variable': var_name,
            'expected_count': expected_count if should_check_cardinality else None,
            'actual_count': actual_count,
            'expected_values': constraint.expected_values if should_check_values else None,
            'actual_values': [str(v) for v in unique_vals]
        }

    return errors, passed

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
