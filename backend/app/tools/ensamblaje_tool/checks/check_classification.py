"""
Check específico de variables de clasificación para instrumentos de ensamblaje
"""
import pandas as pd
from typing import Dict
from ....core.models import VariableCategorization, ClassificationValidationResult

def analyze_classification_variables(
    data: pd.DataFrame, 
    categorization: VariableCategorization
) -> ClassificationValidationResult:
    """
    Análisis de variables de clasificación específico para instrumentos de ensamblaje
    """
    result = ClassificationValidationResult(is_valid=True)
    
    # Get instruments for analysis
    instruments = _get_instruments(data, categorization)
    
    # Add validation parameters info
    result.validation_parameters = {
        'classification_variables': categorization.classification_vars,
        'instrument_variables': categorization.instrument_vars if categorization.instrument_vars else ['(toda la base como un instrumento)'],
        'validation_method': 'Análisis de valores únicos y completitud por instrumento',
        'total_instruments_analyzed': len(instruments),
        'total_items_analyzed': len(data)
    }
    
    try:
        if not categorization.classification_vars:
            result.add_warning(
                "No se han definido variables de clasificación",
                "NO_CLASSIFICATION_VARS"
            )
            return result
        
        empty_cells = {}
        completeness_stats = {}
        unique_counts_per_instrument = {}
        
        for var in categorization.classification_vars:
            if var not in data.columns:
                result.add_warning(
                    f"Variable de clasificación '{var}' no encontrada en los datos",
                    "CLASSIFICATION_VAR_NOT_FOUND",
                    variable=var
                )
                continue
            
            # Check for empty cells in overall data
            null_mask = data[var].isnull()
            empty_indices = data[null_mask].index.tolist()
            
            if empty_indices:
                empty_cells[var] = empty_indices
            
            # Calculate completeness percentage
            total_rows = len(data)
            complete_rows = total_rows - len(empty_indices)
            completeness_percentage = (complete_rows / total_rows) * 100 if total_rows > 0 else 0
            completeness_stats[var] = completeness_percentage
            
            # Count unique values per instrument
            for instrument_key, instrument_data in instruments.items():
                if instrument_key not in unique_counts_per_instrument:
                    unique_counts_per_instrument[instrument_key] = {}
                
                if var in instrument_data.columns:
                    unique_count = instrument_data[var].dropna().nunique()
                    unique_counts_per_instrument[instrument_key][var] = unique_count
        
        result.empty_cells = empty_cells
        result.completeness_stats = completeness_stats
        result.unique_counts_per_instrument = unique_counts_per_instrument
        
        # Statistics
        if empty_cells:
            total_empty = sum(len(indices) for indices in empty_cells.values())
            result.statistics['total_empty_cells'] = total_empty
            result.statistics['variables_with_empty_cells'] = len(empty_cells)
        
        if completeness_stats:
            avg_completeness = sum(completeness_stats.values()) / len(completeness_stats)
            result.statistics['average_completeness'] = round(avg_completeness, 2)
        
        # Summary of unique values across instruments
        if unique_counts_per_instrument:
            result.statistics['instruments_analyzed'] = len(unique_counts_per_instrument)
            
            # Calculate average unique values per variable across instruments
            var_averages = {}
            for var in categorization.classification_vars:
                if var in data.columns:
                    counts = [inst_data.get(var, 0) for inst_data in unique_counts_per_instrument.values()]
                    if counts:
                        var_averages[var] = round(sum(counts) / len(counts), 2)
            
            result.statistics['average_unique_values_per_variable'] = var_averages
        
    except Exception as e:
        result.add_error(
            f"Error durante análisis de variables de clasificación: {str(e)}",
            "VALIDATION_ERROR",
            "error"
        )
    
    return result

def _get_instruments(data: pd.DataFrame, categorization: VariableCategorization) -> Dict[str, pd.DataFrame]:
    """
    Get instruments grouped by instrument variables combination
    """
    if not categorization.instrument_vars:
        return {'default_instrument': data}
    
    instrument_groups = {}
    
    for _, row in data.iterrows():
        instrument_values = {}
        for var in categorization.instrument_vars:
            if var in data.columns:
                instrument_values[var] = str(row[var])
        
        instrument_key = '|'.join([f"{k}:{v}" for k, v in sorted(instrument_values.items())])
        
        if instrument_key not in instrument_groups:
            instrument_groups[instrument_key] = []
        
        instrument_groups[instrument_key].append(row.to_dict())
    
    instruments = {}
    for key, rows in instrument_groups.items():
        instruments[key] = pd.DataFrame(rows)
    
    return instruments