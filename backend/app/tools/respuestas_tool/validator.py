"""
RespuestasValidator - Orquestador delgado para validación de bases de datos de respuestas
"""
import pandas as pd
from datetime import datetime
from ...core.models import (
    RespuestasCategorization, ValidationSummary,
    RespuestasDuplicateValidationResult, ResponseRangeValidationResult,
    MissingPatternsValidationResult, VariabilityValidationResult,
    DuplicateNamesValidationResult, IdenticalColumnsValidationResult,
    RespuestasValidationReport
)
from .checks.check_duplicates_respuestas import validate_duplicates_respuestas
from .checks.check_response_range import validate_response_range
from .checks.check_missing_patterns import validate_missing_patterns
from .checks.check_variability import validate_variability
from .checks.check_duplicate_names import validate_duplicate_names
from .checks.check_identical_columns import validate_identical_columns


class RespuestasValidator:

    def generate_comprehensive_report(
        self,
        data: pd.DataFrame,
        categorization: RespuestasCategorization
    ) -> RespuestasValidationReport:
        try:
            duplicate_validation = validate_duplicates_respuestas(data, categorization)
            response_range_validation = validate_response_range(data, categorization)
            missing_patterns_validation = validate_missing_patterns(data, categorization)
            variability_validation = validate_variability(data, categorization)
            duplicate_names_validation = validate_duplicate_names(data, categorization)
            identical_columns_validation = validate_identical_columns(data, categorization)

            has_errors = any(not v.is_valid for v in [
                duplicate_validation, response_range_validation,
                missing_patterns_validation, variability_validation,
                duplicate_names_validation, identical_columns_validation
            ])

            has_warnings = any(len(v.warnings) > 0 for v in [
                duplicate_validation, response_range_validation,
                missing_patterns_validation, variability_validation,
                duplicate_names_validation, identical_columns_validation
            ])

            if has_errors:
                validation_status = 'error'
            elif has_warnings:
                validation_status = 'warning'
            else:
                validation_status = 'success'

            summary = ValidationSummary(
                total_items=len(data),
                total_instruments=1,
                validation_status=validation_status,
                timestamp=datetime.now().isoformat(),
                categorization=categorization
            )

            report = RespuestasValidationReport(
                summary=summary,
                duplicate_validation=duplicate_validation,
                response_range_validation=response_range_validation,
                missing_patterns_validation=missing_patterns_validation,
                variability_validation=variability_validation,
                duplicate_names_validation=duplicate_names_validation,
                identical_columns_validation=identical_columns_validation,
                export_options=[
                    {
                        'type': 'validation_report_pdf',
                        'name': 'Reporte de Validación (PDF)',
                        'description': 'Reporte completo de validaciones en formato PDF'
                    },
                    {
                        'type': 'validation_excel',
                        'name': 'Reporte de Validación Detallado (Excel)',
                        'description': 'Base original con problemas marcados + detalle por validación sin truncar'
                    }
                ]
            )

            return report

        except Exception as e:
            summary = ValidationSummary(
                total_items=len(data),
                total_instruments=0,
                validation_status='error',
                timestamp=datetime.now().isoformat(),
                categorization=categorization
            )

            error_result = RespuestasDuplicateValidationResult(is_valid=False)
            error_result.add_error(
                f"Error crítico durante generación de reporte: {str(e)}",
                "REPORT_GENERATION_ERROR"
            )

            return RespuestasValidationReport(
                summary=summary,
                duplicate_validation=error_result,
                response_range_validation=ResponseRangeValidationResult(is_valid=False),
                missing_patterns_validation=MissingPatternsValidationResult(is_valid=False),
                variability_validation=VariabilityValidationResult(is_valid=False),
                duplicate_names_validation=DuplicateNamesValidationResult(is_valid=False),
                identical_columns_validation=IdenticalColumnsValidationResult(is_valid=False)
            )
