"""
Check de rango de respuestas: valores observados vs valores válidos declarados
"""
import pandas as pd
import numpy as np
from ....core.models import RespuestasCategorization, ResponseRangeValidationResult


def validate_response_range(
    data: pd.DataFrame,
    categorization: RespuestasCategorization
) -> ResponseRangeValidationResult:
    result = ResponseRangeValidationResult(is_valid=True)

    result.validation_parameters = {
        'response_vars': categorization.response_vars,
        'items_with_config': len(categorization.item_configs)
    }

    if not categorization.response_vars:
        result.add_warning(
            "No se definieron variables de respuesta",
            "NO_RESPONSE_VARS"
        )
        return result

    try:
        items_with_issues = 0
        total_out_of_range = 0
        out_of_range_by_item = {}

        for var in categorization.response_vars:
            if var not in data.columns:
                continue

            item_config = categorization.get_item_config(var)
            if not item_config or not item_config.valid_values:
                continue

            valid_set = set()
            for v in item_config.valid_values:
                valid_set.add(str(v))

            missing_set = set()
            for v in item_config.missing_values:
                missing_set.add(str(v))
            if item_config.missing_includes_empty:
                missing_set.add('__EMPTY__')

            col = data[var]
            out_of_range_indices = []
            out_of_range_values = {}

            for idx, value in col.items():
                if pd.isna(value):
                    if item_config.missing_includes_empty:
                        continue
                    if '__EMPTY__' in missing_set:
                        continue
                    out_of_range_indices.append(int(idx))
                    val_key = '(vacío/NaN)'
                    out_of_range_values[val_key] = out_of_range_values.get(val_key, 0) + 1
                    continue

                str_val = str(value).strip()
                if str_val in valid_set or str_val in missing_set:
                    continue

                out_of_range_indices.append(int(idx))
                out_of_range_values[str_val] = out_of_range_values.get(str_val, 0) + 1

            if out_of_range_indices:
                items_with_issues += 1
                total_out_of_range += len(out_of_range_indices)

                out_of_range_by_item[var] = {
                    'count': len(out_of_range_indices),
                    'percentage': round((len(out_of_range_indices) / len(data)) * 100, 2),
                    'invalid_values': out_of_range_values,
                    'valid_values': item_config.valid_values,
                    'missing_values': item_config.missing_values,
                    'row_indices': out_of_range_indices[:50]
                }

        result.out_of_range_by_item = out_of_range_by_item
        result.statistics = {
            'items_checked': len([v for v in categorization.response_vars if categorization.get_item_config(v) and categorization.get_item_config(v).valid_values]),
            'items_with_issues': items_with_issues,
            'total_out_of_range_cells': total_out_of_range
        }

        if items_with_issues > 0:
            result.is_valid = False
            result.add_error(
                f"{items_with_issues} ítem(s) con valores fuera de rango ({total_out_of_range} celdas)",
                "OUT_OF_RANGE_VALUES"
            )

    except Exception as e:
        result.add_error(
            f"Error durante validación de rango: {str(e)}",
            "VALIDATION_ERROR"
        )

    return result
