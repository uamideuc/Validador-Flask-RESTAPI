"""
Tests for data models and database operations
"""
import pytest
import tempfile
import os
from app.models.data_models import (
    VariableCategorization, ValidationResult, DuplicateValidationResult,
    MetadataValidationResult, ClassificationValidationResult, ValidationSummary,
    ValidationReport, DuplicateItem
)
from app.models.database import DatabaseManager

class TestDataModels:
    """Test data model classes"""
    
    def test_variable_categorization_creation(self):
        """Test VariableCategorization creation and serialization"""
        categorization = VariableCategorization(
            instrument_vars=['var1', 'var2'],
            item_id_vars=['id'],
            metadata_vars=['meta1', 'meta2'],
            classification_vars=['class1'],
            other_vars=['other1']
        )
        
        assert len(categorization.instrument_vars) == 2
        assert 'var1' in categorization.instrument_vars
        
        # Test serialization
        data_dict = categorization.to_dict()
        assert data_dict['instrument_vars'] == ['var1', 'var2']
        
        # Test deserialization
        new_categorization = VariableCategorization.from_dict(data_dict)
        assert new_categorization.instrument_vars == categorization.instrument_vars
    
    def test_validation_result_error_handling(self):
        """Test ValidationResult error and warning handling"""
        result = ValidationResult(is_valid=True)
        
        # Add error - should set is_valid to False
        result.add_error("Test error", "TEST_001", "error", context_key="context_value")
        assert result.is_valid is False
        assert len(result.errors) == 1
        assert result.errors[0].message == "Test error"
        assert result.errors[0].context["context_key"] == "context_value"
        
        # Add warning - should not affect is_valid
        result.add_warning("Test warning", "WARN_001", warning_context="warning_value")
        assert len(result.warnings) == 1
        assert result.warnings[0].message == "Test warning"
    
    def test_duplicate_validation_result_serialization(self):
        """Test DuplicateValidationResult serialization"""
        duplicate_item = DuplicateItem(
            item_id="item1",
            instrument_combination={"instrument": "test", "level": "1"},
            row_indices=[1, 5]
        )
        
        result = DuplicateValidationResult(
            is_valid=False,
            duplicate_items=[duplicate_item],
            instruments_analyzed=2,
            total_items_checked=100
        )
        
        data_dict = result.to_dict()
        assert data_dict['is_valid'] is False
        assert data_dict['instruments_analyzed'] == 2
        assert len(data_dict['duplicate_items']) == 1
        assert data_dict['duplicate_items'][0]['item_id'] == "item1"
    
    def test_validation_report_complete_serialization(self):
        """Test complete ValidationReport serialization"""
        categorization = VariableCategorization(
            instrument_vars=['instrument'],
            item_id_vars=['id'],
            metadata_vars=['metadata'],
            classification_vars=['classification']
        )
        
        summary = ValidationSummary(
            total_items=100,
            total_instruments=3,
            validation_status='success',
            timestamp='2023-01-01T00:00:00',
            categorization=categorization
        )
        
        duplicate_result = DuplicateValidationResult(is_valid=True)
        metadata_result = MetadataValidationResult(is_valid=True)
        classification_result = ClassificationValidationResult(is_valid=True)
        
        report = ValidationReport(
            summary=summary,
            duplicate_validation=duplicate_result,
            metadata_validation=metadata_result,
            classification_validation=classification_result
        )
        
        # Test JSON serialization
        json_str = report.to_json()
        assert '"total_items": 100' in json_str
        assert '"validation_status": "success"' in json_str

class TestDatabaseManager:
    """Test database operations"""
    
    @pytest.fixture
    def temp_db(self):
        """Create temporary database for testing"""
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.db')
        temp_file.close()
        
        db_manager = DatabaseManager(temp_file.name)
        yield db_manager
        
        # Cleanup
        os.unlink(temp_file.name)
    
    def test_database_initialization(self, temp_db):
        """Test database table creation"""
        with temp_db.get_connection() as conn:
            cursor = conn.cursor()
            
            # Check that tables exist
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in cursor.fetchall()]
            
            assert 'uploads' in tables
            assert 'validation_sessions' in tables
            assert 'exports' in tables
    
    def test_upload_record_operations(self, temp_db):
        """Test upload record CRUD operations"""
        # Create upload record
        upload_id = temp_db.create_upload_record(
            filename='test.xlsx',
            file_path='/path/to/test.xlsx',
            file_size=1024,
            sheet_name='Sheet1',
            variables=['var1', 'var2', 'var3']
        )
        
        assert upload_id is not None
        
        # Retrieve upload record
        record = temp_db.get_upload_record(upload_id)
        assert record is not None
        assert record['filename'] == 'test.xlsx'
        assert record['sheet_name'] == 'Sheet1'
        assert record['variables'] == ['var1', 'var2', 'var3']
        
        # Update variables
        temp_db.update_upload_variables(upload_id, ['new_var1', 'new_var2'])
        updated_record = temp_db.get_upload_record(upload_id)
        assert updated_record['variables'] == ['new_var1', 'new_var2']
        assert updated_record['status'] == 'parsed'
    
    def test_validation_session_operations(self, temp_db):
        """Test validation session operations"""
        # Create upload first
        upload_id = temp_db.create_upload_record(
            filename='test.csv',
            file_path='/path/to/test.csv',
            file_size=512
        )
        
        # Create validation session
        categorization = {
            'instrument_vars': ['var1'],
            'item_id_vars': ['id'],
            'metadata_vars': ['meta1'],
            'classification_vars': ['class1'],
            'other_vars': []
        }
        
        session_id = temp_db.create_validation_session(upload_id, categorization)
        assert session_id is not None
        
        # Update with results
        results = {'status': 'completed', 'errors': []}
        temp_db.update_validation_results(session_id, results)
        
        # Retrieve session
        session = temp_db.get_validation_session(session_id)
        assert session is not None
        assert session['categorization'] == categorization
        assert session['validation_results'] == results
        assert session['status'] == 'completed'
    
    def test_export_record_operations(self, temp_db):
        """Test export record operations"""
        # Create upload and session first
        upload_id = temp_db.create_upload_record('test.xlsx', '/path/test.xlsx', 1024)
        session_id = temp_db.create_validation_session(upload_id, {})
        
        # Create export record
        export_id = temp_db.create_export_record(
            session_id=session_id,
            export_type='normalized_xlsx',
            file_path='/path/to/export.xlsx'
        )
        
        assert export_id is not None
        
        # Retrieve export record
        export_record = temp_db.get_export_record(export_id)
        assert export_record is not None
        assert export_record['export_type'] == 'normalized_xlsx'
        assert export_record['file_path'] == '/path/to/export.xlsx'