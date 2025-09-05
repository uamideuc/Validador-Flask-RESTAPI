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

def _get_instruments_from_data(data: pd.DataFrame, categorization: VariableCategorization) -> Dict[str, pd.DataFrame]:
    """
    Agrupa los datos por instrumentos usando las variables de identificación de instrumentos
    """
    if not categorization.instrument_vars:
        return {'default_instrument': data}
    
    instruments = {}
    
    for index, row in data.iterrows():
        # Crear clave del instrumento
        instrument_values = {}
        for var in categorization.instrument_vars:
            if var in data.columns:
                instrument_values[var] = str(row[var])
        
        instrument_key = "|".join([f"{k}:{v}" for k, v in sorted(instrument_values.items())])
        
        if instrument_key not in instruments:
            instruments[instrument_key] = []
        
        instruments[instrument_key].append(row.to_dict())
    
    # Convertir listas a DataFrames
    for key, rows in instruments.items():
        instruments[key] = pd.DataFrame(rows)
    
    return instruments


def _analyze_variable_by_instrument(data: pd.DataFrame, variable: str) -> Dict[str, any]:
    """
    Analiza una variable crítica mostrando distribución de valores y faltantes
    """
    # Contar valores no nulos
    non_null_data = data[variable].dropna()
    value_counts = non_null_data.value_counts().to_dict()
    
    # Contar valores faltantes
    missing_count = data[variable].isnull().sum()
    total_observations = len(data)
    
    # Preparar distribución ordenada
    unique_values = smart_sort_values([str(val) for val in value_counts.keys()])
    
    distribution = []
    for value in unique_values:
        count = value_counts.get(value, 0)
        percentage = (count / total_observations) * 100 if total_observations > 0 else 0
        distribution.append({
            'value': str(value),
            'count': int(count),
            'percentage': round(percentage, 1)
        })
    
    return {
        'total_observations': total_observations,
        'unique_values_count': len(unique_values),
        'missing_count': int(missing_count),
        'missing_percentage': round((missing_count / total_observations) * 100, 1) if total_observations > 0 else 0,
        'distribution': distribution
    }


def validate_metadata_completeness(
    data: pd.DataFrame, 
    categorization: VariableCategorization
) -> MetadataValidationResult:
    """
    Validación de variables críticas por instrumento con enfoque en valores faltantes y distribución
    """
    result = MetadataValidationResult(is_valid=True)
    
    result.validation_parameters = {
        'metadata_variables': categorization.metadata_vars,
        'instrument_variables': categorization.instrument_vars,
        'validation_method': 'Análisis por instrumento con distribución de valores',
        'total_items_analyzed': len(data)
    }
    
    try:
        if not categorization.metadata_vars:
            result.add_warning(
                "No se han definido variables de información crítica",
                "NO_METADATA_VARS"
            )
            return result
        
        # Agrupar datos por instrumentos
        instruments = _get_instruments_from_data(data, categorization)
        
        # Estructura nueva: análisis por instrumento
        instruments_analysis = {}
        overall_missing = 0
        overall_observations = 0
        
        for instrument_key, instrument_data in instruments.items():
            instrument_analysis = {
                'total_observations': len(instrument_data),
                'variables_analysis': {}
            }
            
            for var in categorization.metadata_vars:
                if var not in instrument_data.columns:
                    result.add_error(
                        f"Variable crítica '{var}' no encontrada en el instrumento {instrument_key}",
                        "METADATA_VAR_NOT_FOUND",
                        "error",
                        variable=var,
                        instrument=instrument_key
                    )
                    continue
                
                var_analysis = _analyze_variable_by_instrument(instrument_data, var)
                instrument_analysis['variables_analysis'][var] = var_analysis
                
                # Acumular estadísticas generales
                overall_missing += var_analysis['missing_count']
                overall_observations += var_analysis['total_observations']
            
            instruments_analysis[instrument_key] = instrument_analysis
        
        # Almacenar análisis en el resultado
        result.statistics = {
            'instruments_analysis': instruments_analysis,
            'total_missing_values': overall_missing,
            'total_observations_analyzed': overall_observations,
            'missing_percentage_overall': round((overall_missing / overall_observations) * 100, 1) if overall_observations > 0 else 0
        }
        
        # Marcar como inválido si hay valores faltantes (información crítica no puede tener faltantes)
        if overall_missing > 0:
            result.is_valid = False
        
        # Mantener compatibilidad con estructura anterior (pero deprecated)
        result.missing_values = {}
        result.completeness_stats = {}
        result.unique_values_summary = {}
        
    except Exception as e:
        result.add_error(
            f"Error durante validación de variables críticas: {str(e)}",
            "VALIDATION_ERROR",
            "error"
        )
    
    return result