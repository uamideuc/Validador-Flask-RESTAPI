"""
EnsamblajeValidator - Orquestador delgado para validación de instrumentos de ensamblaje
Importa y ejecuta los checks específicos
"""
import pandas as pd
from typing import Dict, Any
from datetime import datetime
from ...core.models import (
    VariableCategorization, ValidationReport, ValidationSummary,
    DuplicateValidationResult, MetadataValidationResult, ClassificationValidationResult
)
from ..common_checks.check_duplicates import validate_duplicates
from .checks.check_metadata import validate_metadata_completeness
from .checks.check_classification import analyze_classification_variables

class EnsamblajeValidator:
    """
    Orquestador delgado para validación de ensamblaje
    Importa y ejecuta los checks específicos
    """
    
    def __init__(self):
        pass
    
    def generate_comprehensive_report(
        self, 
        data: pd.DataFrame, 
        categorization: VariableCategorization
    ) -> ValidationReport:
        """
        Generar reporte completo orquestando checks específicos
        """
        try:
            # Ejecutar checks específicos (orquestación delgada)
            duplicate_validation = validate_duplicates(data, categorization)
            metadata_validation = validate_metadata_completeness(data, categorization)
            classification_validation = analyze_classification_variables(data, categorization)
            
            # Determinar estado general de validación
            has_errors = (
                not duplicate_validation.is_valid or
                not metadata_validation.is_valid or
                not classification_validation.is_valid
            )
            
            has_warnings = (
                len(duplicate_validation.warnings) > 0 or
                len(metadata_validation.warnings) > 0 or
                len(classification_validation.warnings) > 0
            )
            
            if has_errors:
                validation_status = 'error'
            elif has_warnings:
                validation_status = 'warning'
            else:
                validation_status = 'success'
            
            # Crear resumen
            instruments = self._get_instruments(data, categorization)
            summary = ValidationSummary(
                total_items=len(data),
                total_instruments=len(instruments),
                validation_status=validation_status,
                timestamp=datetime.now().isoformat(),
                categorization=categorization
            )
            
            # Crear reporte completo
            report = ValidationReport(
                summary=summary,
                duplicate_validation=duplicate_validation,
                metadata_validation=metadata_validation,
                classification_validation=classification_validation,
                export_options=[
                    {
                        'type': 'normalized_xlsx',
                        'name': 'Datos Normalizados (Excel)',
                        'description': 'Base de datos con nombres de variables estandarizados'
                    },
                    {
                        'type': 'validation_report',
                        'name': 'Reporte de Validación (PDF)',
                        'description': 'Reporte completo de validaciones en formato PDF'
                    }
                ]
            )
            
            return report
            
        except Exception as e:
            # Crear reporte de error
            error_validation = DuplicateValidationResult(is_valid=False)
            error_validation.add_error(
                f"Error crítico durante generación de reporte: {str(e)}",
                "REPORT_GENERATION_ERROR",
                "error"
            )
            
            summary = ValidationSummary(
                total_items=len(data),
                total_instruments=0,
                validation_status='error',
                timestamp=datetime.now().isoformat(),
                categorization=categorization
            )
            
            return ValidationReport(
                summary=summary,
                duplicate_validation=error_validation,
                metadata_validation=MetadataValidationResult(is_valid=False),
                classification_validation=ClassificationValidationResult(is_valid=False)
            )
    
    def _get_instruments(self, data: pd.DataFrame, categorization: VariableCategorization) -> Dict[str, pd.DataFrame]:
        """
        Obtener instrumentos agrupados por variables de instrumento
        """
        if not categorization.instrument_vars:
            return {'default_instrument': data}
        
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