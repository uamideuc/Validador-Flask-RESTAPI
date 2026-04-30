"""
Check de columnas idénticas entre variables de respuesta
"""
import pandas as pd
import hashlib
from ....core.models import RespuestasCategorization, IdenticalColumnsValidationResult


def validate_identical_columns(
    data: pd.DataFrame,
    categorization: RespuestasCategorization
) -> IdenticalColumnsValidationResult:
    result = IdenticalColumnsValidationResult(is_valid=True)

    columns_to_check = (
        categorization.participant_id_vars +
        categorization.other_relevant_vars +
        categorization.response_vars
    )
    response_cols = [c for c in columns_to_check if c in data.columns]

    result.validation_parameters = {
        'columns_checked': len(response_cols)
    }

    if len(response_cols) < 2:
        result.statistics = {'identical_pairs_found': 0}
        return result

    try:
        col_hashes = {}
        for col in response_cols:
            col_str = data[col].fillna('__NA__').astype(str).str.cat(sep='|')
            col_hash = hashlib.md5(col_str.encode()).hexdigest()

            if col_hash not in col_hashes:
                col_hashes[col_hash] = []
            col_hashes[col_hash].append(col)

        identical_pairs = []
        for col_hash, columns in col_hashes.items():
            if len(columns) > 1:
                identical_pairs.append({
                    'columns': columns,
                    'count': len(columns),
                    'sample_values': data[columns[0]].dropna().head(5).tolist()
                })

        result.identical_pairs = identical_pairs
        result.statistics = {
            'identical_pairs_found': len(identical_pairs),
            'total_identical_columns': sum(p['count'] for p in identical_pairs)
        }

        if identical_pairs:
            total_cols = sum(p['count'] for p in identical_pairs)
            result.add_warning(
                f"{len(identical_pairs)} grupo(s) de columnas idénticas detectado(s) ({total_cols} columnas)",
                "IDENTICAL_COLUMNS_FOUND"
            )

    except Exception as e:
        result.add_error(
            f"Error durante validación de columnas idénticas: {str(e)}",
            "VALIDATION_ERROR"
        )

    return result
