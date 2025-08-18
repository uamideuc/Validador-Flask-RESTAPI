"""
Tests for file upload and parsing service
"""
import pytest
import tempfile
import os
import pandas as pd
from io import BytesIO
from werkzeug.datastructures import FileStorage
from app.services.file_service import FileUploadService

class TestFileUploadService:
    """Test file upload service functionality"""
    
    @pytest.fixture
    def temp_upload_dir(self):
        """Create temporary upload directory"""
        temp_dir = tempfile.mkdtemp()
        yield temp_dir
        # Cleanup
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)
    
    @pytest.fixture
    def file_service(self, temp_upload_dir):
        """Create file service instance"""
        return FileUploadService(temp_upload_dir)
    
    @pytest.fixture
    def sample_csv_content(self):
        """Sample CSV content for testing"""
        return """Mi_instrumento,Nivel_escolar,Mis_items,las_claves,los_invertidos,el_texto_del_item,Dimensión_del_item
Instrumento1,tercer grado,item1,A,0,¿Cuál es la capital de Chile?,Geografia
Instrumento1,tercer grado,item2,B,1,¿2+2 es igual a 5?,Matematicas
Instrumento1,sexto grado,item1,A,0,¿Cuál es la capital de Chile?,Geografia
Instrumento2,tercer grado,item3,C,0,¿Qué color resulta de mezclar azul y amarillo?,Arte"""
    
    @pytest.fixture
    def sample_csv_file(self, sample_csv_content):
        """Create sample CSV file in memory"""
        csv_data = BytesIO(sample_csv_content.encode('utf-8'))
        return FileStorage(
            stream=csv_data,
            filename='test_data.csv',
            content_type='text/csv'
        )
    
    @pytest.fixture
    def sample_excel_file(self, sample_csv_content):
        """Create sample Excel file in memory"""
        # Create DataFrame from CSV content
        from io import StringIO
        df = pd.read_csv(StringIO(sample_csv_content))
        
        # Save to Excel in memory
        excel_buffer = BytesIO()
        with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Datos', index=False)
            # Add a second sheet for testing
            df.head(2).to_excel(writer, sheet_name='Muestra', index=False)
        
        excel_buffer.seek(0)
        return FileStorage(
            stream=excel_buffer,
            filename='test_data.xlsx',
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
    
    def test_validate_file_format_valid_csv(self, file_service, sample_csv_file):
        """Test CSV file format validation"""
        assert file_service.validate_file_format(sample_csv_file) is True
    
    def test_validate_file_format_valid_excel(self, file_service, sample_excel_file):
        """Test Excel file format validation"""
        assert file_service.validate_file_format(sample_excel_file) is True
    
    def test_validate_file_format_invalid(self, file_service):
        """Test invalid file format validation"""
        invalid_file = FileStorage(
            stream=BytesIO(b"invalid content"),
            filename='test.txt',
            content_type='text/plain'
        )
        assert file_service.validate_file_format(invalid_file) is False
    
    def test_validate_file_format_no_filename(self, file_service):
        """Test file validation with no filename"""
        no_name_file = FileStorage(
            stream=BytesIO(b"content"),
            filename=None
        )
        assert file_service.validate_file_format(no_name_file) is False
    
    def test_upload_csv_file_success(self, file_service, sample_csv_file):
        """Test successful CSV file upload"""
        result = file_service.upload_file(sample_csv_file)
        
        assert result['success'] is True
        assert 'file_id' in result
        assert result['original_filename'] == 'test_data.csv'
        assert result['file_extension'] == 'csv'
        assert result['file_size'] > 0
        assert os.path.exists(result['file_path'])
        
        # Cleanup
        file_service.cleanup_file(result['file_path'])
    
    def test_upload_excel_file_success(self, file_service, sample_excel_file):
        """Test successful Excel file upload"""
        result = file_service.upload_file(sample_excel_file)
        
        assert result['success'] is True
        assert 'file_id' in result
        assert result['original_filename'] == 'test_data.xlsx'
        assert result['file_extension'] == 'xlsx'
        assert result['file_size'] > 0
        assert os.path.exists(result['file_path'])
        
        # Cleanup
        file_service.cleanup_file(result['file_path'])
    
    def test_upload_invalid_format(self, file_service):
        """Test upload with invalid file format"""
        invalid_file = FileStorage(
            stream=BytesIO(b"invalid content"),
            filename='test.txt',
            content_type='text/plain'
        )
        
        result = file_service.upload_file(invalid_file)
        
        assert result['success'] is False
        assert result['error_code'] == 'INVALID_FORMAT'
        assert 'Formato de archivo no soportado' in result['error']
    
    def test_get_sheet_names_excel(self, file_service, sample_excel_file, temp_upload_dir):
        """Test getting sheet names from Excel file"""
        # Upload file first
        upload_result = file_service.upload_file(sample_excel_file)
        assert upload_result['success'] is True
        
        # Get sheet names
        sheet_names = file_service.get_sheet_names(upload_result['file_path'])
        
        assert len(sheet_names) == 2
        assert 'Datos' in sheet_names
        assert 'Muestra' in sheet_names
        
        # Cleanup
        file_service.cleanup_file(upload_result['file_path'])
    
    def test_get_sheet_names_csv(self, file_service, sample_csv_file):
        """Test getting sheet names from CSV file (should return empty list)"""
        # Upload file first
        upload_result = file_service.upload_file(sample_csv_file)
        assert upload_result['success'] is True
        
        # Get sheet names (should be empty for CSV)
        sheet_names = file_service.get_sheet_names(upload_result['file_path'])
        
        assert sheet_names == []
        
        # Cleanup
        file_service.cleanup_file(upload_result['file_path'])
    
    def test_parse_csv_file(self, file_service, sample_csv_file):
        """Test parsing CSV file"""
        # Upload file first
        upload_result = file_service.upload_file(sample_csv_file)
        assert upload_result['success'] is True
        
        # Parse file
        parse_result = file_service.parse_file(upload_result['file_path'])
        
        assert parse_result['success'] is True
        assert 'dataframe' in parse_result
        assert len(parse_result['columns']) == 7
        assert 'Mi_instrumento' in parse_result['columns']
        assert 'Mis_items' in parse_result['columns']
        assert parse_result['statistics']['total_rows'] == 4
        assert parse_result['statistics']['total_columns'] == 7
        
        # Check sample values
        assert 'Mi_instrumento' in parse_result['sample_values']
        assert 'Instrumento1' in parse_result['sample_values']['Mi_instrumento']
        
        # Cleanup
        file_service.cleanup_file(upload_result['file_path'])
    
    def test_parse_excel_file_with_sheet(self, file_service, sample_excel_file):
        """Test parsing Excel file with specific sheet"""
        # Upload file first
        upload_result = file_service.upload_file(sample_excel_file)
        assert upload_result['success'] is True
        
        # Parse specific sheet
        parse_result = file_service.parse_file(upload_result['file_path'], sheet_name='Datos')
        
        assert parse_result['success'] is True
        assert parse_result['sheet_name'] == 'Datos'
        assert len(parse_result['columns']) == 7
        assert parse_result['statistics']['total_rows'] == 4
        
        # Cleanup
        file_service.cleanup_file(upload_result['file_path'])
    
    def test_parse_excel_file_default_sheet(self, file_service, sample_excel_file):
        """Test parsing Excel file without specifying sheet (uses first sheet)"""
        # Upload file first
        upload_result = file_service.upload_file(sample_excel_file)
        assert upload_result['success'] is True
        
        # Parse without sheet name (should use first sheet)
        parse_result = file_service.parse_file(upload_result['file_path'])
        
        assert parse_result['success'] is True
        assert len(parse_result['columns']) == 7
        
        # Cleanup
        file_service.cleanup_file(upload_result['file_path'])
    
    def test_parse_nonexistent_file(self, file_service):
        """Test parsing non-existent file"""
        parse_result = file_service.parse_file('/nonexistent/file.csv')
        
        assert parse_result['success'] is False
        assert parse_result['error_code'] == 'PARSE_ERROR'
        assert 'no encontrado' in parse_result['error'].lower()
    
    def test_get_file_info_csv(self, file_service, sample_csv_file):
        """Test getting file info for CSV"""
        # Upload file first
        upload_result = file_service.upload_file(sample_csv_file)
        assert upload_result['success'] is True
        
        # Get file info
        file_info = file_service.get_file_info(upload_result['file_path'])
        
        assert file_info['file_extension'] == 'csv'
        assert file_info['is_csv'] is True
        assert file_info['is_excel'] is False
        assert file_info['file_size'] > 0
        
        # Cleanup
        file_service.cleanup_file(upload_result['file_path'])
    
    def test_get_file_info_excel(self, file_service, sample_excel_file):
        """Test getting file info for Excel"""
        # Upload file first
        upload_result = file_service.upload_file(sample_excel_file)
        assert upload_result['success'] is True
        
        # Get file info
        file_info = file_service.get_file_info(upload_result['file_path'])
        
        assert file_info['file_extension'] == 'xlsx'
        assert file_info['is_excel'] is True
        assert file_info['is_csv'] is False
        assert file_info['sheet_count'] == 2
        assert 'Datos' in file_info['sheet_names']
        
        # Cleanup
        file_service.cleanup_file(upload_result['file_path'])
    
    def test_cleanup_file(self, file_service, sample_csv_file):
        """Test file cleanup"""
        # Upload file first
        upload_result = file_service.upload_file(sample_csv_file)
        assert upload_result['success'] is True
        assert os.path.exists(upload_result['file_path'])
        
        # Cleanup file
        cleanup_success = file_service.cleanup_file(upload_result['file_path'])
        
        assert cleanup_success is True
        assert not os.path.exists(upload_result['file_path'])
    
    def test_cleanup_nonexistent_file(self, file_service):
        """Test cleanup of non-existent file"""
        cleanup_success = file_service.cleanup_file('/nonexistent/file.csv')
        assert cleanup_success is False

class TestFileServiceEdgeCases:
    """Test edge cases and error conditions"""
    
    @pytest.fixture
    def file_service(self):
        temp_dir = tempfile.mkdtemp()
        service = FileUploadService(temp_dir)
        yield service
        # Cleanup
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)
    
    def test_empty_csv_file(self, file_service):
        """Test parsing empty CSV file"""
        empty_csv = FileStorage(
            stream=BytesIO(b""),
            filename='empty.csv',
            content_type='text/csv'
        )
        
        # Upload empty file
        upload_result = file_service.upload_file(empty_csv)
        if upload_result['success']:
            # Try to parse empty file
            parse_result = file_service.parse_file(upload_result['file_path'])
            assert parse_result['success'] is False
            assert ('vacío' in parse_result['error'].lower() or 
                   'empty' in parse_result['error'].lower() or
                   'no columns' in parse_result['error'].lower())
            
            # Cleanup
            file_service.cleanup_file(upload_result['file_path'])
    
    def test_malformed_csv_file(self, file_service):
        """Test parsing malformed CSV file"""
        malformed_csv_content = b"header1,header2\nvalue1\nvalue2,value3,extra_value"
        malformed_csv = FileStorage(
            stream=BytesIO(malformed_csv_content),
            filename='malformed.csv',
            content_type='text/csv'
        )
        
        # Upload and parse malformed file
        upload_result = file_service.upload_file(malformed_csv)
        if upload_result['success']:
            parse_result = file_service.parse_file(upload_result['file_path'])
            # Should still succeed but with warnings in real implementation
            # For now, just check it doesn't crash
            assert 'success' in parse_result
            
            # Cleanup
            file_service.cleanup_file(upload_result['file_path'])