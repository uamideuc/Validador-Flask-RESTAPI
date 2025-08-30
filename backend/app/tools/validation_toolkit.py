from typing import Dict, Any
import pandas as pd
from .base_toolkit import BaseToolKit, ToolResult, ToolStatus
from ..core.models import VariableCategorization, ValidationReport

class ValidationToolKit(BaseToolKit):
    def __init__(self, tool_id: str, session_id: str):
        super().__init__(tool_id, session_id)
        self._validation_engine = None
        self._data = None
        self._categorization = None
    
    def get_metadata(self) -> Dict[str, Any]:
        return {
            'name': 'Validador de Instrumentos',
            'description': 'Herramienta para validación de bases de datos de instrumentos educativos',
            'version': '1.0.0',
            'category': 'validation',
            'features': [
                'Detección de ítems duplicados',
                'Validación de completitud de metadata',
                'Análisis de variables de clasificación',
                'Reporte integral de validaciones'
            ],
            'operations': self.get_available_operations()
        }
    
    def get_available_operations(self) -> Dict[str, str]:
        return {
            'initialize_validation': 'Inicializar validación con datos y categorización',
            'validate_duplicates': 'Validar duplicados por instrumento',
            'validate_metadata': 'Validar completitud de metadata',
            'analyze_classification': 'Analizar variables de clasificación',
            'generate_full_report': 'Generar reporte completo de validación'
        }
    
    def execute(self, operation: str, data: Dict[str, Any]) -> ToolResult:
        self._set_status(ToolStatus.PROCESSING)
        
        try:
            if operation == 'initialize_validation':
                return self._initialize_validation(data)
            elif operation == 'validate_duplicates':
                return self._validate_duplicates()
            elif operation == 'validate_metadata':
                return self._validate_metadata()
            elif operation == 'analyze_classification':
                return self._analyze_classification()
            elif operation == 'generate_full_report':
                return self._generate_full_report()
            else:
                self._set_status(ToolStatus.ERROR)
                return ToolResult(
                    success=False,
                    error=f"Operation '{operation}' not supported"
                )
        
        except Exception as e:
            self._set_status(ToolStatus.ERROR)
            return ToolResult(
                success=False,
                error=f"Error executing operation '{operation}': {str(e)}"
            )
    
    def _initialize_validation(self, data: Dict[str, Any]) -> ToolResult:
        from ..services.validation_engine import ValidationEngine
        
        try:
            # Extract pandas DataFrame from data (assuming it's passed as dict or similar)
            if 'dataframe' not in data or 'categorization' not in data:
                return ToolResult(
                    success=False,
                    error="Missing required data: 'dataframe' and 'categorization'"
                )
            
            self._data = data['dataframe']
            categorization_dict = data['categorization']
            
            # Convert dict to VariableCategorization object
            self._categorization = VariableCategorization(
                instrument_vars=categorization_dict.get('instrument_vars', []),
                item_id_vars=categorization_dict.get('item_id_vars', []),
                metadata_vars=categorization_dict.get('metadata_vars', []),
                classification_vars=categorization_dict.get('classification_vars', []),
                other_vars=categorization_dict.get('other_vars', [])
            )
            
            # Initialize validation engine
            self._validation_engine = ValidationEngine(self._data, self._categorization)
            
            self._set_status(ToolStatus.COMPLETED)
            return ToolResult(
                success=True,
                data={
                    'message': 'Validation initialized successfully',
                    'total_rows': len(self._data),
                    'total_columns': len(self._data.columns)
                }
            )
            
        except Exception as e:
            self._set_status(ToolStatus.ERROR)
            return ToolResult(
                success=False,
                error=f"Failed to initialize validation: {str(e)}"
            )
    
    def _validate_duplicates(self) -> ToolResult:
        if not self._validation_engine:
            return ToolResult(
                success=False,
                error="Validation engine not initialized. Call 'initialize_validation' first."
            )
        
        duplicate_result = self._validation_engine.validate_duplicates()
        
        self._set_status(ToolStatus.COMPLETED)
        return ToolResult(
            success=True,
            data={
                'validation_result': duplicate_result.__dict__,
                'is_valid': duplicate_result.is_valid,
                'total_duplicates': len(duplicate_result.duplicate_items),
                'instruments_analyzed': duplicate_result.instruments_analyzed
            }
        )
    
    def _validate_metadata(self) -> ToolResult:
        if not self._validation_engine:
            return ToolResult(
                success=False,
                error="Validation engine not initialized. Call 'initialize_validation' first."
            )
        
        metadata_result = self._validation_engine.validate_metadata_completeness()
        
        self._set_status(ToolStatus.COMPLETED)
        return ToolResult(
            success=True,
            data={
                'validation_result': metadata_result.__dict__,
                'is_valid': metadata_result.is_valid,
                'completeness_stats': metadata_result.completeness_stats
            }
        )
    
    def _analyze_classification(self) -> ToolResult:
        if not self._validation_engine:
            return ToolResult(
                success=False,
                error="Validation engine not initialized. Call 'initialize_validation' first."
            )
        
        classification_result = self._validation_engine.analyze_classification_variables()
        
        self._set_status(ToolStatus.COMPLETED)
        return ToolResult(
            success=True,
            data={
                'validation_result': classification_result.__dict__,
                'is_valid': classification_result.is_valid,
                'completeness_stats': classification_result.completeness_stats,
                'unique_counts': classification_result.unique_counts_per_instrument
            }
        )
    
    def _generate_full_report(self) -> ToolResult:
        if not self._validation_engine:
            return ToolResult(
                success=False,
                error="Validation engine not initialized. Call 'initialize_validation' first."
            )
        
        full_report = self._validation_engine.generate_comprehensive_report()
        
        self._set_status(ToolStatus.COMPLETED)
        return ToolResult(
            success=True,
            data={
                'validation_report': full_report.__dict__,
                'status': full_report.summary.validation_status,
                'total_items': full_report.summary.total_items,
                'total_instruments': full_report.summary.total_instruments
            }
        )