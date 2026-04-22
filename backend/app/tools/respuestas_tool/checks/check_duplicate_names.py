"""
Check de nombres de variables duplicados en la base de datos
"""
import pandas as pd
from collections import Counter
from ....core.models import RespuestasCategorization, DuplicateNamesValidationResult


def validate_duplicate_names(
    data: pd.DataFrame,
    categorization: RespuestasCategorization
) -> DuplicateNamesValidationResult:
    result = DuplicateNamesValidationResult(is_valid=True)

    all_columns = data.columns.tolist()

    result.validation_parameters = {
        'total_columns': len(all_columns)
    }

    try:
        name_counts = Counter(all_columns)
        duplicates = {name: count for name, count in name_counts.items() if count > 1}

        if duplicates:
            duplicate_groups = []
            for name, count in duplicates.items():
                indices = [i for i, col in enumerate(all_columns) if col == name]
                duplicate_groups.append({
                    'name': name,
                    'count': count,
                    'column_indices': indices
                })

            result.duplicate_groups = duplicate_groups
            result.statistics = {
                'total_duplicate_names': len(duplicates),
                'total_affected_columns': sum(d['count'] for d in duplicate_groups)
            }

            result.add_warning(
                f"{len(duplicates)} nombre(s) de variable repetido(s) en la base de datos",
                "DUPLICATE_VARIABLE_NAMES"
            )
        else:
            result.statistics = {
                'total_duplicate_names': 0,
                'total_affected_columns': 0
            }

    except Exception as e:
        result.add_error(
            f"Error durante validación de nombres duplicados: {str(e)}",
            "VALIDATION_ERROR"
        )

    return result
