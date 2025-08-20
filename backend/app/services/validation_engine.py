"""
Validation engine for instrument data validation
"""
import pandas as pd
from typing import Dict, List, Any, Set, Tuple
from app.models.data_models import (
    VariableCategorization, DuplicateValidationResult, MetadataValidationResult,
    ClassificationValidationResult, ValidationSummary, ValidationReport,
    DuplicateItem
)
from datetime import datetime

class ValidationEngine:
    """Main validation engine for instrument data"""
    
    def __init__(self, data: pd.DataFrame, categorization: VariableCategorization):
        self.data = data
        self.categorization = categorization
        self.instruments_cache = None
    
    def _get_instruments(self) -> Dict[str, pd.DataFrame]:
        """
        Get instruments grouped by instrument variables combination
        Returns dict with instrument_key -> DataFrame
        """
        if self.instruments_cache is not None:
            return self.instruments_cache
        
        if not self.categorization.instrument_vars:
            # If no instrument variables, treat all data as one instrument
            self.instruments_cache = {'default_instrument': self.data}
            return self.instruments_cache
        
        # Group by instrument variables
        instrument_groups = {}
        
        # Create instrument combinations
        for _, row in self.data.iterrows():
            instrument_values = {}
            for var in self.categorization.instrument_vars:
                if var in self.data.columns:
                    instrument_values[var] = str(row[var])
            
            # Create a key from the combination
            instrument_key = '|'.join([f"{k}:{v}" for k, v in sorted(instrument_values.items())])
            
            if instrument_key not in instrument_groups:
                instrument_groups[instrument_key] = []
            
            instrument_groups[instrument_key].append(row.to_dict())
        
        # Convert to DataFrames
        self.instruments_cache = {}
        for key, rows in instrument_groups.items():
            self.instruments_cache[key] = pd.DataFrame(rows)
        
        return self.instruments_cache
    
    def validate_duplicates(self) -> DuplicateValidationResult:
        """
        Validate duplicate items within each instrument
        Items can appear in multiple instruments (anchors) but not duplicated within same instrument
        """
        result = DuplicateValidationResult(is_valid=True)
        
        # Add validation parameters info
        result.validation_parameters = {
            'item_id_variables': self.categorization.item_id_vars,
            'instrument_variables': self.categorization.instrument_vars if self.categorization.instrument_vars else ['(toda la base como un instrumento)'],
            'validation_method': 'Búsqueda de IDs duplicados dentro de cada instrumento',
            'total_instruments_analyzed': len(self._get_instruments())
        }
        
        try:
            if not self.categorization.item_id_vars:
                result.add_error(
                    "No se han definido variables de identificador de ítem",
                    "NO_ITEM_ID_VARS",
                    "error"
                )
                return result
            
            instruments = self._get_instruments()
            result.instruments_analyzed = len(instruments)
            
            total_items = 0
            all_duplicates = []
            
            for instrument_key, instrument_data in instruments.items():
                total_items += len(instrument_data)
                
                # Parse instrument key to get combination
                instrument_combination = {}
                if instrument_key != 'default_instrument':
                    for pair in instrument_key.split('|'):
                        key, value = pair.split(':', 1)
                        instrument_combination[key] = value
                
                # Check for duplicates within this instrument
                duplicates = self._find_duplicates_in_instrument(
                    instrument_data, 
                    instrument_combination
                )
                all_duplicates.extend(duplicates)
            
            result.total_items_checked = total_items
            result.duplicate_items = all_duplicates
            
            if all_duplicates:
                result.add_error(
                    f"Se encontraron {len(all_duplicates)} ítems duplicados",
                    "DUPLICATE_ITEMS_FOUND",
                    "error"
                )
                
                # Add statistics
                affected_instruments = len(set(dup.instrument_combination.get('instrument_key', 'default') 
                                             for dup in all_duplicates))
                result.statistics['affected_instruments'] = affected_instruments
                result.statistics['total_duplicates'] = len(all_duplicates)
            else:
                result.statistics['message'] = 'No se encontraron ítems duplicados'
            
        except Exception as e:
            result.add_error(
                f"Error durante validación de duplicados: {str(e)}",
                "VALIDATION_ERROR",
                "error"
            )
        
        return result
    
    def _find_duplicates_in_instrument(self, instrument_data: pd.DataFrame, 
                                     instrument_combination: Dict[str, str]) -> List[DuplicateItem]:
        """Find duplicate items within a single instrument"""
        duplicates = []
        
        for item_var in self.categorization.item_id_vars:
            if item_var not in instrument_data.columns:
                continue
            
            # Find duplicated values (excluding NaN)
            non_null_data = instrument_data[item_var].dropna()
            value_counts = non_null_data.value_counts()
            duplicated_values = value_counts[value_counts > 1]
            
            for item_id, count in duplicated_values.items():
                # Get row indices where this item appears (from original data)
                mask = instrument_data[item_var] == item_id
                row_indices = instrument_data[mask].index.tolist()
                
                duplicate_item = DuplicateItem(
                    item_id=str(item_id),
                    instrument_combination=instrument_combination,
                    row_indices=row_indices
                )
                duplicates.append(duplicate_item)
        
        return duplicates
    
    def validate_metadata_completeness(self) -> MetadataValidationResult:
        """
        Validate that all metadata variables have complete values
        Metadata variables should never have missing values
        """
        result = MetadataValidationResult(is_valid=True)
        
        # Add validation parameters info
        result.validation_parameters = {
            'metadata_variables': self.categorization.metadata_vars,
            'validation_method': 'Análisis de completitud de variables de metadata',
            'total_items_analyzed': len(self.data)
        }
        
        try:
            if not self.categorization.metadata_vars:
                result.add_warning(
                    "No se han definido variables de metadata",
                    "NO_METADATA_VARS"
                )
                return result
            
            missing_values = {}
            completeness_stats = {}
            unique_values_summary = {}
            
            for var in self.categorization.metadata_vars:
                if var not in self.data.columns:
                    result.add_error(
                        f"Variable de metadata '{var}' no encontrada en los datos",
                        "METADATA_VAR_NOT_FOUND",
                        "error",
                        variable=var
                    )
                    continue
                
                # Check for missing values
                null_mask = self.data[var].isnull()
                missing_indices = self.data[null_mask].index.tolist()
                
                if missing_indices:
                    missing_values[var] = missing_indices
                    result.add_error(
                        f"Variable de metadata '{var}' tiene {len(missing_indices)} valores faltantes",
                        "MISSING_METADATA_VALUES",
                        "error",
                        variable=var,
                        missing_count=len(missing_indices)
                    )
                
                # Calculate completeness percentage
                total_rows = len(self.data)
                complete_rows = total_rows - len(missing_indices)
                completeness_percentage = (complete_rows / total_rows) * 100 if total_rows > 0 else 0
                completeness_stats[var] = completeness_percentage
                
                # Get unique values summary
                unique_values = set(self.data[var].dropna().astype(str).unique())
                unique_values_summary[var] = unique_values
            
            result.missing_values = missing_values
            result.completeness_stats = completeness_stats
            result.unique_values_summary = unique_values_summary
            
            # Overall statistics
            if missing_values:
                total_missing = sum(len(indices) for indices in missing_values.values())
                result.statistics['total_missing_values'] = total_missing
                result.statistics['variables_with_missing'] = len(missing_values)
            else:
                result.statistics['message'] = 'Todas las variables de metadata están completas'
            
            # Calculate overall completeness
            if completeness_stats:
                avg_completeness = sum(completeness_stats.values()) / len(completeness_stats)
                result.statistics['average_completeness'] = round(avg_completeness, 2)
            
        except Exception as e:
            result.add_error(
                f"Error durante validación de metadata: {str(e)}",
                "VALIDATION_ERROR",
                "error"
            )
        
        return result
    
    def analyze_classification_variables(self) -> ClassificationValidationResult:
        """
        Analyze classification variables for empty cells and unique value counts
        Classification variables can have empty values (this is acceptable)
        """
        result = ClassificationValidationResult(is_valid=True)
        
        # Add validation parameters info
        result.validation_parameters = {
            'classification_variables': self.categorization.classification_vars,
            'instrument_variables': self.categorization.instrument_vars if self.categorization.instrument_vars else ['(toda la base como un instrumento)'],
            'validation_method': 'Análisis de valores únicos y completitud por instrumento',
            'total_instruments_analyzed': len(self._get_instruments()),
            'total_items_analyzed': len(self.data)
        }
        
        try:
            if not self.categorization.classification_vars:
                result.add_warning(
                    "No se han definido variables de clasificación",
                    "NO_CLASSIFICATION_VARS"
                )
                return result
            
            empty_cells = {}
            completeness_stats = {}
            unique_counts_per_instrument = {}
            
            instruments = self._get_instruments()
            
            for var in self.categorization.classification_vars:
                if var not in self.data.columns:
                    result.add_warning(
                        f"Variable de clasificación '{var}' no encontrada en los datos",
                        "CLASSIFICATION_VAR_NOT_FOUND",
                        variable=var
                    )
                    continue
                
                # Check for empty cells in overall data
                null_mask = self.data[var].isnull()
                empty_indices = self.data[null_mask].index.tolist()
                
                if empty_indices:
                    empty_cells[var] = empty_indices
                
                # Calculate completeness percentage
                total_rows = len(self.data)
                complete_rows = total_rows - len(empty_indices)
                completeness_percentage = (complete_rows / total_rows) * 100 if total_rows > 0 else 0
                completeness_stats[var] = completeness_percentage
                
                # Count unique values per instrument
                for instrument_key, instrument_data in instruments.items():
                    if instrument_key not in unique_counts_per_instrument:
                        unique_counts_per_instrument[instrument_key] = {}
                    
                    if var in instrument_data.columns:
                        unique_count = instrument_data[var].dropna().nunique()
                        unique_counts_per_instrument[instrument_key][var] = unique_count
            
            result.empty_cells = empty_cells
            result.completeness_stats = completeness_stats
            result.unique_counts_per_instrument = unique_counts_per_instrument
            
            # Statistics
            if empty_cells:
                total_empty = sum(len(indices) for indices in empty_cells.values())
                result.statistics['total_empty_cells'] = total_empty
                result.statistics['variables_with_empty_cells'] = len(empty_cells)
            
            if completeness_stats:
                avg_completeness = sum(completeness_stats.values()) / len(completeness_stats)
                result.statistics['average_completeness'] = round(avg_completeness, 2)
            
            # Summary of unique values across instruments
            if unique_counts_per_instrument:
                result.statistics['instruments_analyzed'] = len(unique_counts_per_instrument)
                
                # Calculate average unique values per variable across instruments
                var_averages = {}
                for var in self.categorization.classification_vars:
                    if var in self.data.columns:
                        counts = [inst_data.get(var, 0) for inst_data in unique_counts_per_instrument.values()]
                        if counts:
                            var_averages[var] = round(sum(counts) / len(counts), 2)
                
                result.statistics['average_unique_values_per_variable'] = var_averages
            
        except Exception as e:
            result.add_error(
                f"Error durante análisis de variables de clasificación: {str(e)}",
                "VALIDATION_ERROR",
                "error"
            )
        
        return result
    
    def generate_comprehensive_report(self) -> ValidationReport:
        """
        Generate a comprehensive validation report combining all validation results
        """
        try:
            # Run all validations
            duplicate_validation = self.validate_duplicates()
            metadata_validation = self.validate_metadata_completeness()
            classification_validation = self.analyze_classification_variables()
            
            # Determine overall validation status
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
            
            # Create summary
            instruments = self._get_instruments()
            summary = ValidationSummary(
                total_items=len(self.data),
                total_instruments=len(instruments),
                validation_status=validation_status,
                timestamp=datetime.now().isoformat(),
                categorization=self.categorization
            )
            
            # Create comprehensive report
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
            # Create error report
            error_validation = DuplicateValidationResult(is_valid=False)
            error_validation.add_error(
                f"Error crítico durante generación de reporte: {str(e)}",
                "REPORT_GENERATION_ERROR",
                "error"
            )
            
            summary = ValidationSummary(
                total_items=len(self.data) if hasattr(self, 'data') else 0,
                total_instruments=0,
                validation_status='error',
                timestamp=datetime.now().isoformat(),
                categorization=self.categorization if hasattr(self, 'categorization') else VariableCategorization()
            )
            
            return ValidationReport(
                summary=summary,
                duplicate_validation=error_validation,
                metadata_validation=MetadataValidationResult(is_valid=False),
                classification_validation=ClassificationValidationResult(is_valid=False)
            )