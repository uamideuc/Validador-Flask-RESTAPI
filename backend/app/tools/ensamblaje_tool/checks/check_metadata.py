"""
Check específico de metadata para instrumentos de ensamblaje
"""
import pandas as pd
from typing import Dict, Set, List
from ....core.models import VariableCategorization, MetadataValidationResult

def smart_sort_values(values_list: List[str]) -> List[str]:
    """
    Ordena valores de forma inteligente:
    - Si todos son numéricos: orden numérico (1, 2, 10, 20)
    - Si hay no-numéricos: números primero, luego strings alfabéticamente
    """
    if not values_list:
        return values_list
    
    # Separar valores numéricos y no-numéricos
    numeric_values = []
    string_values = []
    
    for value in values_list:
        try:
            # Intentar convertir a número
            float_val = float(value)
            numeric_values.append((float_val, value))  # Guardar tanto el número como el string original
        except (ValueError, TypeError):
            string_values.append(value)
    
    # Ordenar cada grupo
    numeric_values.sort(key=lambda x: x[0])  # Ordenar por valor numérico
    string_values.sort()  # Ordenar alfabéticamente
    
    # Combinar: números primero, luego strings
    result = [original_str for _, original_str in numeric_values] + string_values
    return result

def validate_metadata_completeness(
    data: pd.DataFrame, 
    categorization: VariableCategorization
) -> MetadataValidationResult:
    """
    Validación de completitud de metadata específica para instrumentos de ensamblaje
    """
    result = MetadataValidationResult(is_valid=True)
    
    # Add validation parameters info
    result.validation_parameters = {
        'metadata_variables': categorization.metadata_vars,
        'validation_method': 'Análisis de completitud de variables de metadata',
        'total_items_analyzed': len(data)
    }
    
    try:
        if not categorization.metadata_vars:
            result.add_warning(
                "No se han definido variables de metadata",
                "NO_METADATA_VARS"
            )
            return result
        
        missing_values = {}
        completeness_stats = {}
        unique_values_summary = {}
        
        for var in categorization.metadata_vars:
            if var not in data.columns:
                result.add_error(
                    f"Variable de metadata '{var}' no encontrada en los datos",
                    "METADATA_VAR_NOT_FOUND",
                    "error",
                    variable=var
                )
                continue
            
            # Check for missing values
            null_mask = data[var].isnull()
            missing_indices = data[null_mask].index.tolist()
            
            if missing_indices:
                missing_values[var] = missing_indices
                result.add_error(
                    f"Variable de metadata '{var}' tiene {len(missing_indices)} valores faltantes",
                    "MISSING_METADATA_VALUES",
                    "error",
                    variable=var,
                    missing_count=len(missing_indices)
                )
            
            # Calculate completeness percentage
            total_rows = len(data)
            complete_rows = total_rows - len(missing_indices)
            completeness_percentage = (complete_rows / total_rows) * 100 if total_rows > 0 else 0
            completeness_stats[var] = completeness_percentage
            
            unique_values = set(data[var].dropna().astype(str).unique())
            unique_values_summary[var] = smart_sort_values(list(unique_values))
        
        result.missing_values = missing_values
        result.completeness_stats = completeness_stats
        result.unique_values_summary = unique_values_summary
        
        # Overall statistics
        if missing_values:
            total_missing = sum(len(indices) for indices in missing_values.values())
            result.statistics['total_missing_values'] = total_missing
            result.statistics['variables_with_missing'] = len(missing_values)
        else:
            result.statistics['message'] = 'Todas las variables de metadata están completas'
        
        # Calculate overall completeness
        if completeness_stats:
            avg_completeness = sum(completeness_stats.values()) / len(completeness_stats)
            result.statistics['average_completeness'] = round(avg_completeness, 2)
        
    except Exception as e:
        result.add_error(
            f"Error durante validación de metadata: {str(e)}",
            "VALIDATION_ERROR",
            "error"
        )
    
    return result