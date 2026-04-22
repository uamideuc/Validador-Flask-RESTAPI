"""
Check de duplicados para respuestas: ID duplicado simple vs clon completo
"""
import pandas as pd
from typing import List
from ....core.models import RespuestasCategorization, RespuestasDuplicateValidationResult


def validate_duplicates_respuestas(
    data: pd.DataFrame,
    categorization: RespuestasCategorization
) -> RespuestasDuplicateValidationResult:
    result = RespuestasDuplicateValidationResult(is_valid=True)

    result.validation_parameters = {
        'participant_id_variables': categorization.participant_id_vars,
        'total_rows': len(data)
    }

    if not categorization.participant_id_vars:
        result.add_warning(
            "No se definieron variables de ID de participante",
            "NO_PARTICIPANT_ID_VARS"
        )
        return result

    try:
        id_cols = [c for c in categorization.participant_id_vars if c in data.columns]
        if not id_cols:
            result.add_error(
                "Ninguna variable de ID de participante encontrada en los datos",
                "ID_VARS_NOT_FOUND"
            )
            return result

        all_data_cols = [c for c in data.columns if c in (
            categorization.participant_id_vars +
            categorization.response_vars +
            categorization.other_relevant_vars +
            categorization.metadata_vars
        )]

        dup_mask = data.duplicated(subset=id_cols, keep=False)
        dup_rows = data[dup_mask]

        if len(dup_rows) == 0:
            result.statistics = {
                'total_duplicated_ids': 0,
                'total_clone_rows': 0,
                'total_simple_dup_rows': 0
            }
            return result

        simple_duplicates = []
        clone_duplicates = []

        grouped = dup_rows.groupby(id_cols, dropna=False)
        for group_key, group_df in grouped:
            if isinstance(group_key, str):
                id_display = {id_cols[0]: str(group_key)}
            else:
                id_display = {col: str(val) for col, val in zip(id_cols, group_key)}

            row_indices = group_df.index.tolist()

            compare_cols = [c for c in all_data_cols if c not in id_cols]
            if compare_cols:
                all_equal = group_df[compare_cols].apply(
                    lambda col: col.fillna('__NA__').nunique() == 1
                ).all()
            else:
                all_equal = True

            entry = {
                'id_values': id_display,
                'count': len(group_df),
                'row_indices': row_indices[:20]
            }

            if all_equal:
                clone_duplicates.append(entry)
            else:
                simple_duplicates.append(entry)

        result.simple_duplicates = simple_duplicates
        result.clone_duplicates = clone_duplicates

        total_simple = sum(d['count'] for d in simple_duplicates)
        total_clones = sum(d['count'] for d in clone_duplicates)

        result.statistics = {
            'total_duplicated_ids': len(simple_duplicates) + len(clone_duplicates),
            'total_simple_dup_rows': total_simple,
            'total_clone_rows': total_clones,
            'simple_dup_groups': len(simple_duplicates),
            'clone_groups': len(clone_duplicates)
        }

        if simple_duplicates:
            result.is_valid = False
            result.add_error(
                f"{len(simple_duplicates)} grupo(s) con ID duplicado y valores distintos ({total_simple} filas)",
                "SIMPLE_DUPLICATES_FOUND"
            )

        if clone_duplicates:
            result.add_warning(
                f"{len(clone_duplicates)} grupo(s) con filas completamente idénticas ({total_clones} filas)",
                "CLONE_DUPLICATES_FOUND"
            )

    except Exception as e:
        result.add_error(
            f"Error durante validación de duplicados: {str(e)}",
            "VALIDATION_ERROR"
        )

    return result
