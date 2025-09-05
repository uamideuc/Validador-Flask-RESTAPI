"""
Core data models for the validation system
"""
from dataclasses import dataclass, field
from typing import List, Dict, Set, Any, Optional
from enum import Enum
import json
from datetime import datetime

class VariableCategory(Enum):
    INSTRUMENT = 'instrument'
    ITEM_ID = 'item_id'
    METADATA = 'metadata'
    CLASSIFICATION = 'classification'
    OTHER = 'other'

@dataclass
class VariableCategorization:
    """Categorization of variables by type"""
    instrument_vars: List[str] = field(default_factory=list)
    item_id_vars: List[str] = field(default_factory=list)
    metadata_vars: List[str] = field(default_factory=list)
    classification_vars: List[str] = field(default_factory=list)
    other_vars: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, List[str]]:
        """Convert to dictionary for JSON serialization"""
        return {
            'instrument_vars': self.instrument_vars,
            'item_id_vars': self.item_id_vars,
            'metadata_vars': self.metadata_vars,
            'classification_vars': self.classification_vars,
            'other_vars': self.other_vars
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, List[str]]) -> 'VariableCategorization':
        """Create from dictionary"""
        return cls(
            instrument_vars=data.get('instrument_vars', []),
            item_id_vars=data.get('item_id_vars', []),
            metadata_vars=data.get('metadata_vars', []),
            classification_vars=data.get('classification_vars', []),
            other_vars=data.get('other_vars', [])
        )

@dataclass
class ValidationError:
    """Represents a validation error or warning"""
    message: str
    error_code: str
    severity: str  # 'error', 'warning', 'info'
    context: Dict[str, Any] = field(default_factory=dict)

@dataclass
class ValidationWarning:
    """Represents a validation warning"""
    message: str
    warning_code: str
    context: Dict[str, Any] = field(default_factory=dict)

@dataclass
class ValidationResult:
    """Base class for validation results"""
    is_valid: bool
    errors: List[ValidationError] = field(default_factory=list)
    warnings: List[ValidationWarning] = field(default_factory=list)
    statistics: Dict[str, Any] = field(default_factory=dict)
    
    def add_error(self, message: str, error_code: str, severity: str = 'error', **context):
        """Add an error to the result"""
        self.errors.append(ValidationError(message, error_code, severity, context))
        if severity == 'error':
            self.is_valid = False
    
    def add_warning(self, message: str, warning_code: str, **context):
        """Add a warning to the result"""
        self.warnings.append(ValidationWarning(message, warning_code, context))

@dataclass
class DuplicateItem:
    """Represents a duplicate item found in validation"""
    item_id: str
    instrument_combination: Dict[str, str]
    row_indices: List[int]
    
@dataclass
class DuplicateValidationResult(ValidationResult):
    """Results from duplicate validation"""
    duplicate_items: List[DuplicateItem] = field(default_factory=list)
    instruments_analyzed: int = 0
    total_items_checked: int = 0
    validation_parameters: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            'is_valid': self.is_valid,
            'errors': [{'message': e.message, 'code': e.error_code, 'severity': e.severity, 'context': e.context} for e in self.errors],
            'warnings': [{'message': w.message, 'code': w.warning_code, 'context': w.context} for w in self.warnings],
            'statistics': self.statistics,
            'duplicate_items': [
                {
                    'item_id': item.item_id,
                    'instrument_combination': item.instrument_combination,
                    'row_indices': item.row_indices
                } for item in self.duplicate_items
            ],
            'instruments_analyzed': self.instruments_analyzed,
            'total_items_checked': self.total_items_checked,
            'validation_parameters': self.validation_parameters
        }

@dataclass
class MetadataValidationResult(ValidationResult):
    """Results from metadata completeness validation"""
    missing_values: Dict[str, List[int]] = field(default_factory=dict)  # variable -> row indices
    completeness_stats: Dict[str, float] = field(default_factory=dict)  # variable -> completion percentage
    unique_values_summary: Dict[str, Set[str]] = field(default_factory=dict)
    validation_parameters: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            'is_valid': self.is_valid,
            'errors': [{'message': e.message, 'code': e.error_code, 'severity': e.severity, 'context': e.context} for e in self.errors],
            'warnings': [{'message': w.message, 'code': w.warning_code, 'context': w.context} for w in self.warnings],
            'statistics': self.statistics,
            'missing_values': self.missing_values,
            'completeness_stats': self.completeness_stats,
            'unique_values_summary': {k: list(v) for k, v in self.unique_values_summary.items()},
            'validation_parameters': self.validation_parameters
        }

@dataclass
class ClassificationValidationResult(ValidationResult):
    """Results from classification variable analysis"""
    empty_cells: Dict[str, List[int]] = field(default_factory=dict)  # variable -> row indices
    unique_counts_per_instrument: Dict[str, Dict[str, int]] = field(default_factory=dict)  # instrument -> {variable: count}
    completeness_stats: Dict[str, float] = field(default_factory=dict)
    validation_parameters: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            'is_valid': self.is_valid,
            'errors': [{'message': e.message, 'code': e.error_code, 'severity': e.severity, 'context': e.context} for e in self.errors],
            'warnings': [{'message': w.message, 'code': w.warning_code, 'context': w.context} for w in self.warnings],
            'statistics': self.statistics,
            'empty_cells': self.empty_cells,
            'unique_counts_per_instrument': self.unique_counts_per_instrument,
            'completeness_stats': self.completeness_stats,
            'validation_parameters': self.validation_parameters
        }

@dataclass
class ValidationSummary:
    """Summary of all validation results"""
    total_items: int
    total_instruments: int
    validation_status: str  # 'success', 'warning', 'error'
    timestamp: str
    categorization: VariableCategorization
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            'total_items': self.total_items,
            'total_instruments': self.total_instruments,
            'validation_status': self.validation_status,
            'timestamp': self.timestamp,
            'categorization': self.categorization.to_dict()
        }

@dataclass 
class InstrumentValidationResult(ValidationResult):
    """Results from instrument identification validation"""
    instrument_summary: Dict[str, Any] = field(default_factory=dict)
    instruments_detail: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    validation_parameters: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            'is_valid': self.is_valid,
            'errors': [{'message': e.message, 'code': e.error_code, 'severity': e.severity, 'context': e.context} for e in self.errors],
            'warnings': [{'message': w.message, 'code': w.warning_code, 'context': w.context} for w in self.warnings],
            'statistics': self.statistics,
            'instrument_summary': self.instrument_summary,
            'instruments_detail': self.instruments_detail,
            'validation_parameters': self.validation_parameters
        }

@dataclass
class ValidationReport:
    """Complete validation report"""
    summary: ValidationSummary
    instrument_validation: InstrumentValidationResult
    duplicate_validation: DuplicateValidationResult
    metadata_validation: MetadataValidationResult
    classification_validation: ClassificationValidationResult
    export_options: List[Dict[str, Any]] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            'summary': self.summary.to_dict(),
            'instrument_validation': self.instrument_validation.to_dict(),
            'duplicate_validation': self.duplicate_validation.to_dict(),
            'metadata_validation': self.metadata_validation.to_dict(),
            'classification_validation': self.classification_validation.to_dict(),
            'export_options': self.export_options
        }
    
    def to_json(self) -> str:
        """Convert to JSON string"""
        return json.dumps(self.to_dict(), indent=2, ensure_ascii=False)