"""
Validación de Identificadores de Instrumentos  
Información sobre instrumentos, observaciones por instrumento, y nombres de instrumentos
"""
import pandas as pd
from typing import Dict, Any, List
from ....core.models import InstrumentValidationResult


def _calculate_variable_hierarchy(data: pd.DataFrame, instrument_vars: List[str]) -> List[str]:
    """
    Calcula jerarquía de variables por cardinalidad (menor = más general)
    """
    if len(instrument_vars) <= 1:
        return instrument_vars
    
    # Calcular cardinalidad (número de valores únicos) para cada variable
    cardinalities = []
    for var in instrument_vars:
        if var in data.columns:
            cardinality = data[var].nunique()
            cardinalities.append((var, cardinality))
    
    # Ordenar por cardinalidad (menor = más general)
    cardinalities.sort(key=lambda x: x[1])
    
    return [var for var, _ in cardinalities]


def _create_instrument_display_name(instrument_values: Dict[str, str], hierarchy: List[str] = None) -> str:
    """
    Crea un nombre atractivo y legible para el instrumento
    Usa jerarquía de general a específico basada en cardinalidad
    """
    if not instrument_values:
        return "Instrumento sin identificar"
    
    # Si solo hay una variable, mostrar su valor
    if len(instrument_values) == 1:
        var_name, value = next(iter(instrument_values.items()))
        return f"{value}"
    
    # Usar jerarquía proporcionada o orden original
    ordered_vars = hierarchy if hierarchy else list(instrument_values.keys())
    
    # Crear partes del nombre siguiendo jerarquía
    parts = []
    temporal_parts = []  # Para años, fechas, etc.
    
    for var_name in ordered_vars:
        if var_name not in instrument_values:
            continue

        value = str(instrument_values[var_name])

        # Detectar variables temporales (van al final entre paréntesis)
        if any(keyword in var_name.lower() for keyword in ['año', 'year', 'fecha', 'date', 'periodo', 'tanda']):
            temporal_parts.append(value)
        else:
            parts.append(value)
    
    # Construir nombre final
    display_name = " - ".join(parts)
    
    # Agregar partes temporales entre paréntesis
    if temporal_parts:
        display_name += f" ({', '.join(temporal_parts)})"
    
    return display_name


def validate_instruments_identification(data: pd.DataFrame, categorization) -> InstrumentValidationResult:
    """
    Validación - Identificador de instrumentos (INFORMATIVA)
    
    Muestra:
    1. Cuántos instrumentos
    2. Cuántas observaciones por cada instrumento  
    3. Los nombres de cada instrumento (concatenación inteligente de variables)
    
    Args:
        data: DataFrame con los datos
        categorization: VariableCategorization con las variables categorizadas
    
    Returns:
        InstrumentValidationResult con información de instrumentos
    """
    result = InstrumentValidationResult(is_valid=True)  # Siempre válido, es informativo
    
    try:
        instrument_vars = categorization.instrument_vars or []
        result.validation_parameters = {
            'instrument_variables': instrument_vars,
            'total_rows_analyzed': len(data)
        }
        
        # Si no hay variables de instrumento, tratar toda la base como un instrumento
        if not instrument_vars:
            result.instrument_summary = {
                'total_instruments': 1,
                'total_observations': len(data)
            }
            
            result.instruments_detail = {
                'default_instrument': {
                    'display_name': 'Toda la base de datos',
                    'observations_count': len(data),
                    'instrument_variables': {}
                }
            }
            
        else:
            # Calcular jerarquía de variables por cardinalidad
            variable_hierarchy = _calculate_variable_hierarchy(data, instrument_vars)
            
            # Agrupar por variables de instrumento
            instruments_data = {}
            
            for index, row in data.iterrows():
                # Obtener valores de variables de instrumento
                instrument_values = {}
                for var in instrument_vars:
                    if var in data.columns:
                        instrument_values[var] = str(row[var])
                
                # Crear clave única para agrupar (técnica)
                instrument_key = "|".join([f"{k}:{v}" for k, v in sorted(instrument_values.items())])
                
                # Crear nombre atractivo para mostrar usando jerarquía
                display_name = _create_instrument_display_name(instrument_values, variable_hierarchy)
                
                if instrument_key not in instruments_data:
                    instruments_data[instrument_key] = {
                        'display_name': display_name,
                        'instrument_values': instrument_values,
                        'observations': []
                    }
                
                instruments_data[instrument_key]['observations'].append(index)
            
            # Crear resumen
            result.instrument_summary = {
                'total_instruments': len(instruments_data),
                'total_observations': len(data)
            }
            
            # Detalles por instrumento
            instruments_detail = {}
            for key, data_info in instruments_data.items():
                instruments_detail[key] = {
                    'display_name': data_info['display_name'],
                    'observations_count': len(data_info['observations']),
                    'instrument_variables': data_info['instrument_values']
                }
            
            result.instruments_detail = instruments_detail
        
        return result
        
    except Exception as e:
        result.add_error(
            f"Error durante análisis de identificadores de instrumentos: {str(e)}",
            "INSTRUMENT_ANALYSIS_ERROR"
        )
        return result