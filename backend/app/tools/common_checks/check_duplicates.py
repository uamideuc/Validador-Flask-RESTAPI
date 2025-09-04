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

def validate_duplicates(
    data: pd.DataFrame, 
    categorization: VariableCategorization
) -> DuplicateValidationResult:
    """
    Validación de duplicados reutilizable entre herramientas
    """
    result = DuplicateValidationResult(is_valid=True)
    
    # Add validation parameters info
    instruments = _get_instruments(data, categorization)
    result.validation_parameters = {
        'item_id_variables': categorization.item_id_vars,
        'instrument_variables': categorization.instrument_vars if categorization.instrument_vars else [SINGLE_INSTRUMENT_DISPLAY],
        'validation_method': 'Búsqueda de IDs duplicados dentro de cada instrumento',
        'total_instruments_analyzed': len(instruments)
    }
    
    try:
        if not categorization.item_id_vars:
            result.add_error(
                "No se han definido variables de identificador de ítem",
                "NO_ITEM_ID_VARS",
                "error"
            )
            return result
        
        result.instruments_analyzed = len(instruments)
        
        total_items = 0
        all_duplicates = []
        
        for instrument_key, instrument_data in instruments.items():
            total_items += len(instrument_data)
            
            # Parse instrument key to get combination
            instrument_combination = {}
            if instrument_key != SINGLE_INSTRUMENT_KEY:
                for pair in instrument_key.split('|'):
                    key, value = pair.split(':', 1)
                    instrument_combination[key] = value
            
            # Check for duplicates within this instrument
            duplicates = _find_duplicates_in_instrument(
                instrument_data, 
                instrument_combination,
                categorization
            )
            all_duplicates.extend(duplicates)
        
        result.total_items_checked = total_items
        result.duplicate_items = all_duplicates
        
        if all_duplicates:
            result.add_error(
                f"Se encontraron {len(all_duplicates)} ítems duplicados",
                "DUPLICATE_ITEMS_FOUND",
                "error"
            )
            
            # Add statistics
            affected_instruments = len(set(dup.instrument_combination.get('instrument_key', 'default') 
                                         for dup in all_duplicates))
            result.statistics['affected_instruments'] = affected_instruments
            result.statistics['total_duplicates'] = len(all_duplicates)
        else:
            result.statistics['message'] = 'No se encontraron ítems duplicados'
        
        
    except Exception as e:
        result.add_error(
            f"Error durante validación de duplicados: {str(e)}",
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