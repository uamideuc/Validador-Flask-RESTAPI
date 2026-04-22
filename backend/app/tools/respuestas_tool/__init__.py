"""
RespuestasToolKit - Herramienta para validación de bases de datos de respuestas
"""
import pandas as pd
from typing import Dict, Any
from ...core.models import RespuestasCategorization, RespuestasValidationReport
from .validator import RespuestasValidator
from .exporter import RespuestasExporter


class RespuestasToolKit:

    def __init__(self, session_id: str):
        self.session_id = session_id
        self.validator = RespuestasValidator()
        self.exporter = RespuestasExporter(session_id)
        self.data: pd.DataFrame = None
        self.categorization: RespuestasCategorization = None

    def initialize(self, data: pd.DataFrame, categorization: RespuestasCategorization) -> Dict[str, Any]:
        self.data = data
        self.categorization = categorization

        return {
            'success': True,
            'message': 'RespuestasToolKit inicializado exitosamente',
            'total_rows': len(self.data),
            'total_columns': len(self.data.columns),
            'session_id': self.session_id
        }

    def run_validation(self) -> RespuestasValidationReport:
        if self.data is None or self.categorization is None:
            raise ValueError("ToolKit no ha sido inicializado correctamente")

        return self.validator.generate_comprehensive_report(self.data, self.categorization)

    def export_data(self, export_type: str, validation_session_id: int) -> Dict[str, Any]:
        if self.data is None or self.categorization is None:
            raise ValueError("ToolKit no ha sido inicializado correctamente")

        return self.exporter.export(
            export_type=export_type,
            data=self.data,
            categorization=self.categorization,
            validation_session_id=validation_session_id
        )

    def get_variable_values(self, variable: str, **kwargs) -> Dict[str, Any]:
        if self.data is None or self.categorization is None:
            raise ValueError("ToolKit no ha sido inicializado correctamente")

        if variable not in self.data.columns:
            return {
                'error': f'Variable {variable} no encontrada en los datos',
                'values': [],
                'total_count': 0
            }

        col = self.data[variable]
        value_counts = col.value_counts(dropna=False)
        total_rows = len(self.data)
        empty_count = int(col.isna().sum())

        values_data = []
        for value, count in value_counts.items():
            display_value = '(vacío/NaN)' if pd.isna(value) else str(value)
            values_data.append({
                'value': display_value,
                'count': int(count),
                'percentage': round((count / total_rows) * 100, 2)
            })

        return {
            'variable': variable,
            'total_count': total_rows,
            'unique_values': len(values_data),
            'completeness': round(((total_rows - empty_count) / total_rows) * 100, 2) if total_rows > 0 else 0,
            'empty_count': empty_count,
            'values': values_data
        }

    def get_metadata(self) -> Dict[str, Any]:
        return {
            'name': 'Validador - Respuestas',
            'description': 'Herramienta especializada para validación de bases de datos de respuestas',
            'version': '0.1.0',
            'category': 'validation',
            'supported_operations': [
                'initialize',
                'run_validation',
                'export_data',
                'get_variable_values'
            ]
        }


__all__ = ['RespuestasToolKit']
