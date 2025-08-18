"""
Integration tests for file API endpoints
"""
import pytest
import tempfile
import os
import json
from io import BytesIO
from app import create_app
from app.models.database import DatabaseManager

class TestFileAPIEndpoints:
    """Test file API endpoints"""
    
    @pytest.fixture
    def app(self):
        """Create test application"""
        app = create_app()
        app.config['TESTING'] = True
        
        # Use temporary directories for testing
        temp_upload_dir = tempfile.mkdtemp()
        temp_db_file = tempfile.NamedTemporaryFile(delete=False, suffix='.db')
        temp_db_file.close()
        
        app.config['UPLOAD_FOLDER'] = temp_upload_dir
        app.config['DATABASE_PATH'] = temp_db_file.name
        
        # Initialize test database
        test_db = DatabaseManager(temp_db_file.name)
        
        yield app
        
        # Cleanup
        import shutil
        shutil.rmtree(temp_upload_dir, ignore_errors=True)
        os.unlink(temp_db_file.name)
    
    @pytest.fixture
    def client(self, app):
        """Create test client"""
        return app.test_client()
    
    @pytest.fixture
    def sample_csv_data(self):
        """Sample CSV data for testing"""
        return """Mi_instrumento,Nivel_escolar,Mis_items,las_claves,los_invertidos,el_texto_del_item,Dimensión_del_item
Instrumento1,tercer grado,item1,A,0,¿Cuál es la capital de Chile?,Geografia
Instrumento1,tercer grado,item2,B,1,¿2+2 es igual a 5?,Matematicas
Instrumento1,sexto grado,item1,A,0,¿Cuál es la capital de Chile?,Geografia
Instrumento2,tercer grado,item3,C,0,¿Qué color resulta de mezclar azul y amarillo?,Arte"""
    
    def test_upload_csv_file_success(self, client, sample_csv_data):
        """Test successful CSV file upload"""
        # Create file-like object
        csv_file = BytesIO(sample_csv_data.encode('utf-8'))
        
        response = client.post('/api/files/upload', data={
            'file': (csv_file, 'test_data.csv', 'text/csv')
        })
        
        assert response.status_code == 201
        data = response.get_json()
        
        assert data['success'] is True
        assert 'upload_id' in data
        assert 'file_id' in data
        assert data['filename'] == 'test_data.csv'
        assert data['file_extension'] == 'csv'
        assert data['is_csv'] is True
        assert data['is_excel'] is False
        assert data['file_size'] > 0
    
    def test_upload_no_file(self, client):
        """Test upload without file"""
        response = client.post('/api/files/upload')
        
        assert response.status_code == 400
        data = response.get_json()
        
        assert data['success'] is False
        assert data['error_code'] == 'NO_FILE'
    
    def test_upload_empty_filename(self, client):
        """Test upload with empty filename"""
        response = client.post('/api/files/upload', data={
            'file': (BytesIO(b''), '', 'text/csv')
        })
        
        assert response.status_code == 400
        data = response.get_json()
        
        assert data['success'] is False
        assert data['error_code'] == 'NO_FILE_SELECTED'
    
    def test_upload_invalid_format(self, client):
        """Test upload with invalid file format"""
        txt_file = BytesIO(b'This is a text file')
        
        response = client.post('/api/files/upload', data={
            'file': (txt_file, 'test.txt', 'text/plain')
        })
        
        assert response.status_code == 400
        data = response.get_json()
        
        assert data['success'] is False
        assert data['error_code'] == 'INVALID_FORMAT'
    
    def test_parse_csv_file(self, client, sample_csv_data):
        """Test parsing uploaded CSV file"""
        # First upload file
        csv_file = BytesIO(sample_csv_data.encode('utf-8'))
        upload_response = client.post('/api/files/upload', data={
            'file': (csv_file, 'test_data.csv', 'text/csv')
        })
        
        assert upload_response.status_code == 201
        upload_data = upload_response.get_json()
        upload_id = upload_data['upload_id']
        
        # Parse the file
        parse_response = client.post(f'/api/files/{upload_id}/parse')
        
        assert parse_response.status_code == 200
        parse_data = parse_response.get_json()
        
        assert parse_data['success'] is True
        assert 'variables' in parse_data
        assert len(parse_data['variables']) == 7
        assert 'Mi_instrumento' in parse_data['variables']
        assert 'Mis_items' in parse_data['variables']
        assert 'statistics' in parse_data
        assert parse_data['statistics']['total_rows'] == 4
        assert 'sample_values' in parse_data
    
    def test_get_variables_after_parse(self, client, sample_csv_data):
        """Test getting variables after parsing"""
        # Upload and parse file
        csv_file = BytesIO(sample_csv_data.encode('utf-8'))
        upload_response = client.post('/api/files/upload', data={
            'file': (csv_file, 'test_data.csv', 'text/csv')
        })
        upload_id = upload_response.get_json()['upload_id']
        
        client.post(f'/api/files/{upload_id}/parse')
        
        # Get variables
        variables_response = client.get(f'/api/files/{upload_id}/variables')
        
        assert variables_response.status_code == 200
        variables_data = variables_response.get_json()
        
        assert variables_data['success'] is True
        assert 'variables' in variables_data
        assert len(variables_data['variables']) == 7
        assert variables_data['status'] == 'parsed'
    
    def test_get_variables_before_parse(self, client, sample_csv_data):
        """Test getting variables before parsing (should fail)"""
        # Upload file but don't parse
        csv_file = BytesIO(sample_csv_data.encode('utf-8'))
        upload_response = client.post('/api/files/upload', data={
            'file': (csv_file, 'test_data.csv', 'text/csv')
        })
        upload_id = upload_response.get_json()['upload_id']
        
        # Try to get variables without parsing
        variables_response = client.get(f'/api/files/{upload_id}/variables')
        
        assert variables_response.status_code == 400
        variables_data = variables_response.get_json()
        
        assert variables_data['success'] is False
        assert variables_data['error_code'] == 'FILE_NOT_PARSED'
    
    def test_save_categorization(self, client, sample_csv_data):
        """Test saving variable categorization"""
        # Upload and parse file
        csv_file = BytesIO(sample_csv_data.encode('utf-8'))
        upload_response = client.post('/api/files/upload', data={
            'file': (csv_file, 'test_data.csv', 'text/csv')
        })
        upload_id = upload_response.get_json()['upload_id']
        
        client.post(f'/api/files/{upload_id}/parse')
        
        # Save categorization
        categorization = {
            'instrument_vars': ['Mi_instrumento', 'Nivel_escolar'],
            'item_id_vars': ['Mis_items'],
            'metadata_vars': ['las_claves', 'los_invertidos'],
            'classification_vars': ['el_texto_del_item', 'Dimensión_del_item'],
            'other_vars': []
        }
        
        categorization_response = client.post(
            f'/api/files/{upload_id}/categorization',
            data=json.dumps(categorization),
            content_type='application/json'
        )
        
        assert categorization_response.status_code == 201
        categorization_data = categorization_response.get_json()
        
        assert categorization_data['success'] is True
        assert 'session_id' in categorization_data
        assert categorization_data['categorization'] == categorization
    
    def test_save_categorization_invalid_json(self, client, sample_csv_data):
        """Test saving categorization with invalid JSON"""
        # Upload and parse file
        csv_file = BytesIO(sample_csv_data.encode('utf-8'))
        upload_response = client.post('/api/files/upload', data={
            'file': (csv_file, 'test_data.csv', 'text/csv')
        })
        upload_id = upload_response.get_json()['upload_id']
        
        client.post(f'/api/files/{upload_id}/parse')
        
        # Try to save categorization without JSON content type
        categorization_response = client.post(
            f'/api/files/{upload_id}/categorization',
            data='invalid data'
        )
        
        assert categorization_response.status_code == 400
        categorization_data = categorization_response.get_json()
        
        assert categorization_data['success'] is False
        assert categorization_data['error_code'] == 'INVALID_CONTENT_TYPE'
    
    def test_save_categorization_missing_fields(self, client, sample_csv_data):
        """Test saving categorization with missing fields"""
        # Upload and parse file
        csv_file = BytesIO(sample_csv_data.encode('utf-8'))
        upload_response = client.post('/api/files/upload', data={
            'file': (csv_file, 'test_data.csv', 'text/csv')
        })
        upload_id = upload_response.get_json()['upload_id']
        
        client.post(f'/api/files/{upload_id}/parse')
        
        # Save incomplete categorization
        incomplete_categorization = {
            'instrument_vars': ['Mi_instrumento'],
            'item_id_vars': ['Mis_items']
            # Missing other required fields
        }
        
        categorization_response = client.post(
            f'/api/files/{upload_id}/categorization',
            data=json.dumps(incomplete_categorization),
            content_type='application/json'
        )
        
        assert categorization_response.status_code == 400
        categorization_data = categorization_response.get_json()
        
        assert categorization_data['success'] is False
        assert categorization_data['error_code'] == 'MISSING_FIELD'
    
    def test_operations_with_nonexistent_file(self, client):
        """Test operations with non-existent upload ID"""
        nonexistent_id = 99999
        
        # Test parse
        parse_response = client.post(f'/api/files/{nonexistent_id}/parse')
        assert parse_response.status_code == 404
        
        # Test get variables
        variables_response = client.get(f'/api/files/{nonexistent_id}/variables')
        assert variables_response.status_code == 404
        
        # Test get sheets
        sheets_response = client.get(f'/api/files/{nonexistent_id}/sheets')
        assert sheets_response.status_code == 404
        
        # Test save categorization
        categorization = {
            'instrument_vars': [],
            'item_id_vars': [],
            'metadata_vars': [],
            'classification_vars': [],
            'other_vars': []
        }
        categorization_response = client.post(
            f'/api/files/{nonexistent_id}/categorization',
            data=json.dumps(categorization),
            content_type='application/json'
        )
        assert categorization_response.status_code == 404

class TestExcelFileAPI:
    """Test Excel file specific API functionality"""
    
    @pytest.fixture
    def app(self):
        """Create test application"""
        app = create_app()
        app.config['TESTING'] = True
        
        # Use temporary directories for testing
        temp_upload_dir = tempfile.mkdtemp()
        temp_db_file = tempfile.NamedTemporaryFile(delete=False, suffix='.db')
        temp_db_file.close()
        
        app.config['UPLOAD_FOLDER'] = temp_upload_dir
        app.config['DATABASE_PATH'] = temp_db_file.name
        
        # Initialize test database
        test_db = DatabaseManager(temp_db_file.name)
        
        yield app
        
        # Cleanup
        import shutil
        shutil.rmtree(temp_upload_dir, ignore_errors=True)
        os.unlink(temp_db_file.name)
    
    @pytest.fixture
    def client(self, app):
        """Create test client"""
        return app.test_client()
    
    @pytest.fixture
    def sample_excel_file(self):
        """Create sample Excel file"""
        import pandas as pd
        
        # Create sample data
        data = {
            'Mi_instrumento': ['Instrumento1', 'Instrumento1', 'Instrumento2'],
            'Nivel_escolar': ['tercer grado', 'tercer grado', 'sexto grado'],
            'Mis_items': ['item1', 'item2', 'item3'],
            'las_claves': ['A', 'B', 'C'],
            'los_invertidos': [0, 1, 0],
            'el_texto_del_item': ['Pregunta 1', 'Pregunta 2', 'Pregunta 3'],
            'Dimensión_del_item': ['Geografia', 'Matematicas', 'Arte']
        }
        df = pd.DataFrame(data)
        
        # Save to Excel in memory
        excel_buffer = BytesIO()
        with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Datos', index=False)
            df.head(2).to_excel(writer, sheet_name='Muestra', index=False)
        
        excel_buffer.seek(0)
        return excel_buffer
    
    def test_upload_excel_file(self, client, sample_excel_file):
        """Test uploading Excel file"""
        response = client.post('/api/files/upload', data={
            'file': (sample_excel_file, 'test_data.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        })
        
        assert response.status_code == 201
        data = response.get_json()
        
        assert data['success'] is True
        assert data['is_excel'] is True
        assert data['is_csv'] is False
        assert 'sheet_names' in data
        assert 'sheet_count' in data
        assert data['sheet_count'] == 2
        assert 'Datos' in data['sheet_names']
        assert 'Muestra' in data['sheet_names']
    
    def test_get_sheets_excel(self, client, sample_excel_file):
        """Test getting sheets from Excel file"""
        # Upload Excel file
        upload_response = client.post('/api/files/upload', data={
            'file': (sample_excel_file, 'test_data.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        })
        upload_id = upload_response.get_json()['upload_id']
        
        # Get sheets
        sheets_response = client.get(f'/api/files/{upload_id}/sheets')
        
        assert sheets_response.status_code == 200
        sheets_data = sheets_response.get_json()
        
        assert sheets_data['success'] is True
        assert sheets_data['is_excel'] is True
        assert len(sheets_data['sheet_names']) == 2
        assert 'Datos' in sheets_data['sheet_names']
        assert 'Muestra' in sheets_data['sheet_names']
    
    def test_parse_excel_with_sheet_selection(self, client, sample_excel_file):
        """Test parsing Excel file with specific sheet"""
        # Upload Excel file
        upload_response = client.post('/api/files/upload', data={
            'file': (sample_excel_file, 'test_data.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        })
        upload_id = upload_response.get_json()['upload_id']
        
        # Parse specific sheet
        parse_response = client.post(
            f'/api/files/{upload_id}/parse',
            data=json.dumps({'sheet_name': 'Datos'}),
            content_type='application/json'
        )
        
        assert parse_response.status_code == 200
        parse_data = parse_response.get_json()
        
        assert parse_data['success'] is True
        assert parse_data['sheet_name'] == 'Datos'
        assert len(parse_data['variables']) == 7
        assert parse_data['statistics']['total_rows'] == 3