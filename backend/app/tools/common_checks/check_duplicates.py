"""
Check reutilizable para detección de duplicados
Puede ser usado por cualquier herramienta (ensamblaje, respuestas, etc.)
"""
import pandas as pd
from typing import Dict, List
from ...core.models import VariableCategorization, DuplicateValidationResult, DuplicateItem

# Constantes para instrumento único
SINGLE_INSTRUMENT_KEY = "default_instrument"
SINGLE_INSTRUMENT_DISPLAY = "Toda la base de datos"

def _analyze_id_variable_by_instrument(data: pd.DataFrame, variable: str) -> Dict[str, any]:
    """
    Analiza una variable ID mostrando únicos, repetidos y faltantes
    """
    # Contar valores no nulos
    non_null_data = data[variable].dropna()
    value_counts = non_null_data.value_counts()
    
    # Contar valores faltantes
    missing_count = data[variable].isnull().sum()
    total_observations = len(data)
    
    # Identificar únicos y repetidos
    unique_values = (value_counts == 1).sum()  # Valores que aparecen solo 1 vez
    duplicated_values = (value_counts > 1).sum()  # Valores que aparecen más de 1 vez
    total_duplicated_items = (value_counts[value_counts > 1]).sum()  # Total de ítems repetidos
    
    # Detalles de valores repetidos para el modal
    repeated_details = []
    for value, count in value_counts[value_counts > 1].items():
        repeated_details.append({
            'value': str(value),
            'count': int(count),
            'times_repeated': int(count - 1)  # Veces que se repite (sin contar la original)
        })
    
    return {
        'total_observations': total_observations,
        'unique_values_count': int(unique_values),
        'duplicated_values_count': int(duplicated_values),
        'total_duplicated_items': int(total_duplicated_items),
        'missing_count': int(missing_count),
        'missing_percentage': round((missing_count / total_observations) * 100, 1) if total_observations > 0 else 0,
        'repeated_details': repeated_details
    }


def validate_duplicates(
    data: pd.DataFrame, 
    categorization: VariableCategorization
) -> DuplicateValidationResult:
    """
    Validación de identificadores de ítems con UX top-notch:
    Análisis por instrumento con únicos, repetidos y faltantes
    """
    result = DuplicateValidationResult(is_valid=True)
    
    result.validation_parameters = {
        'item_id_variables': categorization.item_id_vars,
        'instrument_variables': categorization.instrument_vars,
        'validation_method': 'Análisis por instrumento con identificadores únicos, repetidos y faltantes',
        'total_items_analyzed': len(data)
    }
    
    try:
        if not categorization.item_id_vars:
            result.add_warning(
                "No se han definido variables de identificador de ítem",
                "NO_ITEM_ID_VARS"
            )
            return result
        
        # Agrupar datos por instrumentos
        instruments = _get_instruments(data, categorization)
        
        # Estructura nueva: análisis por instrumento
        instruments_analysis = {}
        overall_duplicates = 0
        overall_missing = 0
        
        for instrument_key, instrument_data in instruments.items():
            instrument_analysis = {
                'total_observations': len(instrument_data),
                'variables_analysis': {}
            }
            
            for var in categorization.item_id_vars:
                if var not in instrument_data.columns:
                    result.add_error(
                        f"Variable de ID '{var}' no encontrada en el instrumento {instrument_key}",
                        "ID_VAR_NOT_FOUND",
                        "error",
                        variable=var,
                        instrument=instrument_key
                    )
                    continue
                
                var_analysis = _analyze_id_variable_by_instrument(instrument_data, var)
                instrument_analysis['variables_analysis'][var] = var_analysis
                
                # Acumular estadísticas generales
                overall_duplicates += var_analysis['total_duplicated_items']
                overall_missing += var_analysis['missing_count']
            
            instruments_analysis[instrument_key] = instrument_analysis
        
        # Almacenar análisis en el resultado
        result.statistics = {
            'instruments_analysis': instruments_analysis,
            'total_duplicated_items': overall_duplicates,
            'total_missing_values': overall_missing,
            'total_observations_analyzed': len(data)
        }
        
        # Marcar como inválido si hay duplicados o faltantes
        if overall_duplicates > 0 or overall_missing > 0:
            result.is_valid = False
        
        # Mantener compatibilidad con estructura anterior (pero deprecated)
        result.duplicate_items = []
        result.instruments_analyzed = len(instruments)
        result.total_items_checked = len(data)
        
    except Exception as e:
        result.add_error(
            f"Error durante validación de identificadores de ítems: {str(e)}",
            "VALIDATION_ERROR",
            "error"
        )
    
    return result


def _get_instruments(data: pd.DataFrame, categorization: VariableCategorization) -> Dict[str, pd.DataFrame]:
    """
    Get instruments grouped by instrument variables combination
    """
    if not categorization.instrument_vars:
        return {SINGLE_INSTRUMENT_KEY: data}
    
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

def _find_duplicates_in_instrument(
    instrument_data: pd.DataFrame, 
    instrument_combination: Dict[str, str],
    categorization: VariableCategorization
) -> List[DuplicateItem]:
    """Find duplicate items within a single instrument"""
    duplicates = []
    
    for item_var in categorization.item_id_vars:
        if item_var not in instrument_data.columns:
            continue
        
        # Find duplicated values (excluding NaN)
        non_null_data = instrument_data[item_var].dropna()
        value_counts = non_null_data.value_counts()
        duplicated_values = value_counts[value_counts > 1]
        
        for item_id, count in duplicated_values.items():
            # Get row indices where this item appears
            mask = instrument_data[item_var] == item_id
            row_indices = instrument_data[mask].index.tolist()
            
            duplicate_item = DuplicateItem(
                item_id=str(item_id),
                instrument_combination=instrument_combination,
                row_indices=row_indices
            )
            duplicates.append(duplicate_item)
    
    return duplicates