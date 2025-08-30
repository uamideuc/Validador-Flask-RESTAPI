"""
Orquestador de exportaciones para EnsamblajeToolKit - Arquitectura Modular
"""
import pandas as pd
from typing import Dict, Any
from ...core.models import VariableCategorization
from .export_formats import (
    NormalizedExcelExporter,
    ValidationExcelExporter,
    PDFReportExporter
)


class EnsamblajeExporter:
    """Orquestador de exportaciones que delega a módulos especializados"""
    
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.db = self._get_db_manager()
    
    def _get_db_manager(self):
        """Get database manager instance usando la misma lógica que tool_runner"""
        from flask import current_app
        if current_app.config.get('TESTING'):
            from ...core.database import DatabaseManager
            db_path = current_app.config.get('DATABASE_PATH', 'test.db')
            return DatabaseManager(db_path)
        else:
            from ...core.database import db_manager
            return db_manager
    
    def export(
        self, 
        export_type: str, 
        data: pd.DataFrame = None, 
        categorization: VariableCategorization = None,
        validation_session_id: int = None
    ) -> Dict[str, Any]:
        """
        Orquestar exportación delegando a los módulos especializados
        """
        if export_type == 'normalized_xlsx':
            if data is None or categorization is None or validation_session_id is None:
                return {
                    'success': False,
                    'error': 'Parámetros faltantes para exportación normalizada'
                }
            
            exporter = NormalizedExcelExporter(self.session_id)
            return exporter.export(data, categorization, validation_session_id)
            
        elif export_type == 'validation_excel':
            if validation_session_id is None:
                return {
                    'success': False,
                    'error': 'validation_session_id requerido para exportación de validación Excel'
                }
            
            exporter = ValidationExcelExporter(self.session_id)
            return exporter.export(validation_session_id)
            
        elif export_type == 'validation_report_pdf':
            if validation_session_id is None:
                return {
                    'success': False,
                    'error': 'validation_session_id requerido para exportación de reporte PDF'
                }
            
            exporter = PDFReportExporter(self.session_id)
            return exporter.export(validation_session_id)
            
        else:
            return {
                'success': False,
                'error': f'Tipo de exportación no soportado: {export_type}'
            }