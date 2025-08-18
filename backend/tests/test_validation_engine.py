"""
Tests for validation engine
"""
import pytest
import pandas as pd
from app.services.validation_engine import ValidationEngine
from app.models.data_models import VariableCategorization

class TestValidationEngine:
    """Test validation engine functionality"""
    
    @pytest.fixture
    def sample_data(self):
        """Create sample instrument data for testing"""
        data = {
            'Mi_instrumento': ['Instrumento1', 'Instrumento1', 'Instrumento1', 'Instrumento2', 'Instrumento2'],
            'Nivel_escolar': ['3° Básico', '3° Básico', '6° Básico', '3° Básico', '3° Básico'],
            'Mis_items': ['item1', 'item1', 'item1', 'item1', 'item3'],  # item1 duplicated in Instrumento1-3°Básico (rows 0,1)
            'las_claves': ['A', 'B', 'A', 'A', None],  # Missing value in metadata
            'los_invertidos': [0, 1, 0, 0, 1],
            'el_texto_del_item': ['Pregunta 1', 'Pregunta 2', 'Pregunta 1', 'Pregunta 1', None],  # Missing classification
            'Dimensión_del_item': ['Geografia', 'Matematicas', 'Geografia', 'Geografia', 'Arte']
        }
        return pd.DataFrame(data)
    
    @pytest.fixture
    def sample_categorization(self):
        """Create sample categorization"""
        return VariableCategorization(
            instrument_vars=['Mi_instrumento', 'Nivel_escolar'],
            item_id_vars=['Mis_items'],
            metadata_vars=['las_claves', 'los_invertidos'],
            classification_vars=['el_texto_del_item', 'Dimensión_del_item'],
            other_vars=[]
        )
    
    def test_validation_engine_initialization(self, sample_data, sample_categorization):
        """Test validation engine initialization"""
        engine = ValidationEngine(sample_data, sample_categorization)
        
        assert engine.data is not None
        assert len(engine.data) == 5
        assert engine.categorization == sample_categorization
    
    def test_get_instruments(self, sample_data, sample_categorization):
        """Test instrument grouping"""
        engine = ValidationEngine(sample_data, sample_categorization)
        instruments = engine._get_instruments()
        
        # Should have 3 instruments: Instrumento1-3°Básico, Instrumento1-6°Básico, Instrumento2-3°Básico
        assert len(instruments) == 3
        
        # Check instrument keys
        keys = list(instruments.keys())
        assert any('Instrumento1' in key and '3° Básico' in key for key in keys)
        assert any('Instrumento1' in key and '6° Básico' in key for key in keys)
        assert any('Instrumento2' in key and '3° Básico' in key for key in keys)
    
    def test_validate_duplicates_with_duplicates(self, sample_data, sample_categorization):
        """Test duplicate validation when duplicates exist"""
        engine = ValidationEngine(sample_data, sample_categorization)
        result = engine.validate_duplicates()
        
        # Should find duplicates
        assert result.is_valid is False
        assert len(result.duplicate_items) > 0
        assert result.instruments_analyzed == 3
        assert result.total_items_checked == 5
        
        # Should have error about duplicates
        assert len(result.errors) > 0
        assert any('duplicados' in error.message.lower() for error in result.errors)
    
    def test_validate_duplicates_no_duplicates(self, sample_categorization):
        """Test duplicate validation when no duplicates exist"""
        # Create data without duplicates
        clean_data = pd.DataFrame({
            'Mi_instrumento': ['Instrumento1', 'Instrumento1', 'Instrumento2'],
            'Nivel_escolar': ['3° Básico', '3° Básico', '3° Básico'],
            'Mis_items': ['item1', 'item2', 'item3'],  # No duplicates
            'las_claves': ['A', 'B', 'C'],
            'los_invertidos': [0, 1, 0],
            'el_texto_del_item': ['Pregunta 1', 'Pregunta 2', 'Pregunta 3'],
            'Dimensión_del_item': ['Geografia', 'Matematicas', 'Arte']
        })
        
        engine = ValidationEngine(clean_data, sample_categorization)
        result = engine.validate_duplicates()
        
        # Should not find duplicates
        assert result.is_valid is True
        assert len(result.duplicate_items) == 0
        assert 'No se encontraron ítems duplicados' in result.statistics.get('message', '')
    
    def test_validate_metadata_completeness_with_missing(self, sample_data, sample_categorization):
        """Test metadata validation when missing values exist"""
        engine = ValidationEngine(sample_data, sample_categorization)
        result = engine.validate_metadata_completeness()
        
        # Should find missing values
        assert result.is_valid is False
        assert len(result.missing_values) > 0
        assert 'las_claves' in result.missing_values  # Has None value
        
        # Should have completeness stats
        assert 'las_claves' in result.completeness_stats
        assert result.completeness_stats['las_claves'] < 100  # Not 100% complete
        
        # Should have errors about missing values
        assert len(result.errors) > 0
    
    def test_validate_metadata_completeness_complete(self, sample_categorization):
        """Test metadata validation when all values are complete"""
        # Create data with complete metadata
        complete_data = pd.DataFrame({
            'Mi_instrumento': ['Instrumento1', 'Instrumento1'],
            'Nivel_escolar': ['3° Básico', '3° Básico'],
            'Mis_items': ['item1', 'item2'],
            'las_claves': ['A', 'B'],  # Complete
            'los_invertidos': [0, 1],  # Complete
            'el_texto_del_item': ['Pregunta 1', 'Pregunta 2'],
            'Dimensión_del_item': ['Geografia', 'Matematicas']
        })
        
        engine = ValidationEngine(complete_data, sample_categorization)
        result = engine.validate_metadata_completeness()
        
        # Should be valid
        assert result.is_valid is True
        assert len(result.missing_values) == 0
        assert all(completeness == 100 for completeness in result.completeness_stats.values())
    
    def test_analyze_classification_variables(self, sample_data, sample_categorization):
        """Test classification variable analysis"""
        engine = ValidationEngine(sample_data, sample_categorization)
        result = engine.analyze_classification_variables()
        
        # Should be valid (classification can have empty values)
        assert result.is_valid is True
        
        # Should identify empty cells
        assert len(result.empty_cells) > 0
        assert 'el_texto_del_item' in result.empty_cells  # Has None value
        
        # Should have completeness stats
        assert 'el_texto_del_item' in result.completeness_stats
        assert result.completeness_stats['el_texto_del_item'] < 100
        
        # Should have unique counts per instrument
        assert len(result.unique_counts_per_instrument) > 0
    
    def test_generate_comprehensive_report(self, sample_data, sample_categorization):
        """Test comprehensive report generation"""
        engine = ValidationEngine(sample_data, sample_categorization)
        report = engine.generate_comprehensive_report()
        
        # Should have all sections
        assert report.summary is not None
        assert report.duplicate_validation is not None
        assert report.metadata_validation is not None
        assert report.classification_validation is not None
        
        # Summary should have correct data
        assert report.summary.total_items == 5
        assert report.summary.total_instruments == 3
        assert report.summary.validation_status in ['success', 'warning', 'error']
        
        # Should have export options
        assert len(report.export_options) > 0
    
    def test_validation_with_no_item_id_vars(self, sample_data):
        """Test validation when no item ID variables are defined"""
        categorization = VariableCategorization(
            instrument_vars=['Mi_instrumento'],
            item_id_vars=[],  # No item ID vars
            metadata_vars=['las_claves'],
            classification_vars=['el_texto_del_item'],
            other_vars=[]
        )
        
        engine = ValidationEngine(sample_data, categorization)
        result = engine.validate_duplicates()
        
        # Should have error about missing item ID vars
        assert result.is_valid is False
        assert len(result.errors) > 0
        assert any('identificador de ítem' in error.message.lower() for error in result.errors)
    
    def test_validation_with_no_metadata_vars(self, sample_data):
        """Test validation when no metadata variables are defined"""
        categorization = VariableCategorization(
            instrument_vars=['Mi_instrumento'],
            item_id_vars=['Mis_items'],
            metadata_vars=[],  # No metadata vars
            classification_vars=['el_texto_del_item'],
            other_vars=[]
        )
        
        engine = ValidationEngine(sample_data, categorization)
        result = engine.validate_metadata_completeness()
        
        # Should have warning about no metadata vars
        assert len(result.warnings) > 0
        assert any('metadata' in warning.message.lower() for warning in result.warnings)
    
    def test_validation_serialization(self, sample_data, sample_categorization):
        """Test that validation results can be serialized to JSON"""
        engine = ValidationEngine(sample_data, sample_categorization)
        report = engine.generate_comprehensive_report()
        
        # Should be able to convert to dict and JSON
        report_dict = report.to_dict()
        assert isinstance(report_dict, dict)
        
        json_str = report.to_json()
        assert isinstance(json_str, str)
        assert len(json_str) > 0