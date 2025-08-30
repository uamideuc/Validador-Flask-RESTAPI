"""
EnsamblajeToolKit - Herramienta para validación de instrumentos de ensamblaje
"""
import pandas as pd
from typing import Dict, Any
from ...core.models import VariableCategorization, ValidationReport
from .validator import EnsamblajeValidator
from .exporter import EnsamblajeExporter

class EnsamblajeToolKit:
    """
    Clase principal del plugin para validación de instrumentos de ensamblaje
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
    
    def get_metadata(self) -> Dict[str, Any]:
        """Metadata del toolkit"""
        return {
            'name': 'Validador de Instrumentos de Ensamblaje',
            'description': 'Herramienta especializada para validación de instrumentos educativos de tipo ensamblaje',
            'version': '1.0.0',
            'category': 'validation',
            'supported_operations': [
                'initialize',
                'run_validation',
                'export_data'
            ]
        }

__all__ = ['EnsamblajeToolKit']