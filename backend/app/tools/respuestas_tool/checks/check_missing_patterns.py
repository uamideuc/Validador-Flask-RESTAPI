"""
Check de patrones de missing: análisis por ítem y por participante
"""
import pandas as pd
import numpy as np
from ....core.models import RespuestasCategorization, MissingPatternsValidationResult
from ..constants import PARTICIPANT_EXCESSIVE_MISSING_THRESHOLD


def _is_missing_value(value, item_config):
    if pd.isna(value):
        return item_config.missing_includes_empty if item_config else True

    if not item_config:
        return False

    str_val = str(value).strip()
    return str_val in [str(m) for m in item_config.missing_values]


def validate_missing_patterns(
    data: pd.DataFrame,
    categorization: RespuestasCategorization
) -> MissingPatternsValidationResult:
    result = MissingPatternsValidationResult(is_valid=True)

    result.validation_parameters = {
        'response_vars': categorization.response_vars,
        'participant_id_vars': categorization.participant_id_vars,
        'excessive_missing_threshold': PARTICIPANT_EXCESSIVE_MISSING_THRESHOLD
    }

    if not categorization.response_vars:
        result.add_warning(
            "No se definieron variables de respuesta",
            "NO_RESPONSE_VARS"
        )
        return result

    try:
        response_cols = [c for c in categorization.response_vars if c in data.columns]

        # --- Analysis by item ---
        missing_by_item = {}
        for var in response_cols:
            item_config = categorization.get_item_config(var)
            missing_count = 0
            missing_row_indices = []

            for idx, value in data[var].items():
                if _is_missing_value(value, item_config):
                    missing_count += 1
                    if len(missing_row_indices) < 50:
                        missing_row_indices.append(int(idx))

            total = len(data)
            pct = round((missing_count / total) * 100, 2) if total > 0 else 0

            declared_missing = []
            if item_config:
                declared_missing = item_config.missing_values
                if item_config.missing_includes_empty:
                    declared_missing = declared_missing + ['(vacío)']

            missing_by_item[var] = {
                'missing_count': missing_count,
                'total': total,
                'percentage': pct,
                'declared_missing_values': [str(m) for m in declared_missing],
                'row_indices': missing_row_indices
            }

        # --- Analysis by participant ---
        missing_by_participant = {}
        participants_with_excessive_missing = []

        id_cols = [c for c in categorization.participant_id_vars if c in data.columns]

        for row_idx, row in data.iterrows():
            missing_in_row = 0
            for var in response_cols:
                item_config = categorization.get_item_config(var)
                if _is_missing_value(row.get(var), item_config):
                    missing_in_row += 1

            pct = round((missing_in_row / len(response_cols)) * 100, 2) if response_cols else 0

            if pct >= PARTICIPANT_EXCESSIVE_MISSING_THRESHOLD:
                participant_id = {}
                for col in id_cols:
                    val = row.get(col)
                    participant_id[col] = str(val) if not pd.isna(val) else '(vacío)'

                participants_with_excessive_missing.append({
                    'row_index': int(row_idx),
                    'participant_id': participant_id,
                    'missing_count': missing_in_row,
                    'total_items': len(response_cols),
                    'percentage': pct
                })

        missing_by_participant = {
            'total_participants': len(data),
            'participants_with_excessive_missing': len(participants_with_excessive_missing),
            'threshold': PARTICIPANT_EXCESSIVE_MISSING_THRESHOLD,
            'details': participants_with_excessive_missing[:100]
        }

        result.missing_by_item = missing_by_item
        result.missing_by_participant = missing_by_participant

        total_missing = sum(m['missing_count'] for m in missing_by_item.values())
        total_cells = len(data) * len(response_cols)
        overall_pct = round((total_missing / total_cells) * 100, 2) if total_cells > 0 else 0

        result.statistics = {
            'total_missing_cells': total_missing,
            'total_cells': total_cells,
            'overall_missing_percentage': overall_pct,
            'items_with_any_missing': sum(1 for m in missing_by_item.values() if m['missing_count'] > 0),
            'participants_with_excessive_missing': len(participants_with_excessive_missing)
        }

        if participants_with_excessive_missing:
            result.add_warning(
                f"{len(participants_with_excessive_missing)} participante(s) con >{PARTICIPANT_EXCESSIVE_MISSING_THRESHOLD}% de respuestas faltantes",
                "EXCESSIVE_MISSING_PARTICIPANTS"
            )

    except Exception as e:
        result.add_error(
            f"Error durante análisis de missing: {str(e)}",
            "VALIDATION_ERROR"
        )

    return result
