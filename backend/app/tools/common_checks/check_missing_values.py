"""
Check reutilizable para detección de valores faltantes en columnas
Puede ser usado por cualquier herramienta (ensamblaje, respuestas, etc.)
"""
import pandas as pd
from typing import Dict, List


def check_missing_values_in_columns(
    data: pd.DataFrame, 
    columns_to_check: List[str]
) -> Dict:
    """
    Check for missing values in specified columns
    """
    missing_details = []
    has_missing_values = False
    
    for column in columns_to_check:
        if column in data.columns:
            missing_count = data[column].isna().sum()
            total_count = len(data)
            
            if missing_count > 0:
                has_missing_values = True
                percentage = round((missing_count / total_count) * 100, 2)
                missing_details.append({
                    'column': column,
                    'missing_count': int(missing_count),
                    'total_count': int(total_count),
                    'percentage': percentage
                })
    
    return {
        'has_missing_values': has_missing_values,
        'details': missing_details,
        'total_columns_checked': len(columns_to_check)
    }