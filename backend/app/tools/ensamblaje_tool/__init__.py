"""
EnsamblajeToolKit - Herramienta para validación de bases de datos de ensamblajes
"""
import pandas as pd
from typing import Dict, Any
from ...core.models import VariableCategorization, ValidationReport
from .validator import EnsamblajeValidator
from .exporter import EnsamblajeExporter
from .constants import get_instrument_display_name

class EnsamblajeToolKit:
    """
    Clase principal del plugin para validación de bases de datos de ensamblajes
    Define la interfaz/API del ToolKit
    """
    
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.validator = EnsamblajeValidator()
        self.exporter = EnsamblajeExporter(session_id)
        self.data: pd.DataFrame = None
        self.categorization: VariableCategorization = None
    
    def initialize(self, data: pd.DataFrame, categorization: VariableCategorization) -> Dict[str, Any]:
        """Inicializar el toolkit con datos y categorización"""
        self.data = data
        self.categorization = categorization
        
        return {
            'success': True,
            'message': 'EnsamblajeToolKit inicializado exitosamente',
            'total_rows': len(self.data),
            'total_columns': len(self.data.columns),
            'session_id': self.session_id
        }
    
    def run_validation(self) -> ValidationReport:
        """Ejecutar validación completa delegando al validator"""
        if self.data is None or self.categorization is None:
            raise ValueError("ToolKit no ha sido inicializado correctamente")
        
        return self.validator.generate_comprehensive_report(self.data, self.categorization)
    
    def export_data(self, export_type: str, validation_session_id: int) -> Dict[str, Any]:
        """Ejecutar exportación delegando al exporter"""
        if self.data is None or self.categorization is None:
            raise ValueError("ToolKit no ha sido inicializado correctamente")
            
        return self.exporter.export(
            export_type=export_type,
            data=self.data,
            categorization=self.categorization,
            validation_session_id=validation_session_id
        )
    
    def get_variable_values(self, variable: str, instrument: str = None) -> Dict[str, Any]:
        """Get detailed variable values for classification analysis"""
        if self.data is None or self.categorization is None:
            raise ValueError("ToolKit no ha sido inicializado correctamente")
        
        # Filter data by instrument if specified
        filtered_data = self.data
        if instrument and instrument != 'all' and self.categorization.instrument_vars:
            # Parse instrument combination from key
            instrument_filters = {}
            if '|' in instrument:
                for pair in instrument.split('|'):
                    if ':' in pair:
                        key, value = pair.split(':', 1)
                        instrument_filters[key] = value
            
            # Apply filters
            for var, value in instrument_filters.items():
                if var in filtered_data.columns:
                    filtered_data = filtered_data[filtered_data[var].astype(str) == value]
        
        if variable not in filtered_data.columns:
            return {
                'error': f'Variable {variable} no encontrada en los datos',
                'values': [],
                'total_count': 0
            }
        
        # Get variable values with counts
        value_counts = filtered_data[variable].value_counts(dropna=False)
        values_data = []
        
        # Calculate completeness statistics
        total_rows = len(filtered_data)
        empty_count = filtered_data[variable].isna().sum()
        non_empty_count = total_rows - empty_count
        completeness = round((non_empty_count / total_rows) * 100, 2) if total_rows > 0 else 0
        
        for value, count in value_counts.items():
            # Get row indices for this value
            if pd.isna(value):
                mask = filtered_data[variable].isna()
                display_value = '(vacío/NaN)'
            else:
                mask = filtered_data[variable] == value
                display_value = str(value)
            
            row_indices = filtered_data[mask].index.tolist()
            
            values_data.append({
                'value': display_value,
                'count': int(count),
                'percentage': round((count / len(filtered_data)) * 100, 2),
                'row_indices': row_indices[:10]  # Limit to first 10 indices for performance
            })
        
        return {
            'variable': variable,
            'instrument': instrument or 'all',
            'total_count': total_rows,
            'unique_values': len(values_data),
            'completeness': completeness,
            'empty_count': int(empty_count),
            'values': values_data
        }

    def get_metadata(self) -> Dict[str, Any]:
        """Metadata del toolkit"""
        return {
            'name': 'Validador de Bases de Datos de Ensamblajes',
            'description': 'Herramienta especializada para validación de bases de datos de ensamblajes',
            'version': '1.0.0',
            'category': 'validation',
            'supported_operations': [
                'initialize',
                'run_validation',
                'export_data',
                'get_variable_values'
            ]
        }

__all__ = ['EnsamblajeToolKit']