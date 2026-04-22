"""
Check de variabilidad: columnas constantes o quasi-constantes
Aplica a categorías 1 (ID), 2 (otras relevantes) y 3 (respuestas)
"""
import pandas as pd
from ....core.models import RespuestasCategorization, VariabilityValidationResult
from ..constants import QUASI_CONSTANT_THRESHOLD


def validate_variability(
    data: pd.DataFrame,
    categorization: RespuestasCategorization
) -> VariabilityValidationResult:
    result = VariabilityValidationResult(is_valid=True)

    columns_to_check = (
        categorization.participant_id_vars +
        categorization.other_relevant_vars +
        categorization.response_vars
    )
    columns_to_check = [c for c in columns_to_check if c in data.columns]

    result.validation_parameters = {
        'columns_checked': columns_to_check,
        'quasi_constant_threshold': QUASI_CONSTANT_THRESHOLD
    }

    if not columns_to_check:
        return result

    try:
        constant_columns = []
        quasi_constant_columns = []

        for col in columns_to_check:
            series = data[col].dropna()
            if len(series) == 0:
                continue

            value_counts = series.value_counts()
            n_unique = len(value_counts)

            if n_unique == 1:
                constant_columns.append({
                    'column': col,
                    'value': str(value_counts.index[0]),
                    'count': int(value_counts.iloc[0]),
                    'total': len(series)
                })
                continue

            dominant_value = value_counts.index[0]
            dominant_count = value_counts.iloc[0]
            dominant_pct = round((dominant_count / len(series)) * 100, 2)

            if dominant_pct >= QUASI_CONSTANT_THRESHOLD:
                quasi_constant_columns.append({
                    'column': col,
                    'dominant_value': str(dominant_value),
                    'dominant_count': int(dominant_count),
                    'dominant_percentage': dominant_pct,
                    'total': len(series),
                    'unique_values': n_unique
                })

        result.constant_columns = constant_columns
        result.quasi_constant_columns = quasi_constant_columns

        result.statistics = {
            'total_columns_checked': len(columns_to_check),
            'constant_columns': len(constant_columns),
            'quasi_constant_columns': len(quasi_constant_columns)
        }

        if constant_columns:
            result.add_warning(
                f"{len(constant_columns)} columna(s) con un solo valor (constante)",
                "CONSTANT_COLUMNS"
            )

        if quasi_constant_columns:
            result.add_warning(
                f"{len(quasi_constant_columns)} columna(s) quasi-constantes (valor dominante >= {QUASI_CONSTANT_THRESHOLD}%)",
                "QUASI_CONSTANT_COLUMNS"
            )

    except Exception as e:
        result.add_error(
            f"Error durante análisis de variabilidad: {str(e)}",
            "VALIDATION_ERROR"
        )

    return result
