"""
Orquestador de exportaciones para RespuestasToolKit
"""
import pandas as pd
from typing import Dict, Any
from ...core.models import RespuestasCategorization
from .export_formats import RespuestasPDFReportExporter, RespuestasValidationExcelExporter


class RespuestasExporter:
    """Despacha exportaciones disponibles para respuestas"""

    def __init__(self, session_id: str):
        self.session_id = session_id

    def export(
        self,
        export_type: str,
        data: pd.DataFrame = None,
        categorization: RespuestasCategorization = None,
        validation_session_id: int = None
    ) -> Dict[str, Any]:
        if export_type == 'validation_report_pdf':
            if validation_session_id is None:
                return {
                    'success': False,
                    'error': 'validation_session_id requerido para exportación de reporte PDF'
                }

            exporter = RespuestasPDFReportExporter(self.session_id)
            return exporter.export(validation_session_id)

        if export_type == 'validation_excel':
            if validation_session_id is None:
                return {
                    'success': False,
                    'error': 'validation_session_id requerido para exportación Excel'
                }
            exporter = RespuestasValidationExcelExporter(self.session_id)
            return exporter.export(validation_session_id)

        return {
            'success': False,
            'error': f'Tipo de exportación no soportado para respuestas: {export_type}'
        }
