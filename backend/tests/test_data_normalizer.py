"""
Tests for data normalizer
"""
import pytest
import pandas as pd
from io import BytesIO
from app.services.data_normalizer import DataNormalizer
from app.models.data_models import VariableCategorization

class TestDataNormalizer:
    """Test data normalizer functionality"""
    
    @pytest.fixture
    def sample_data(self):
        """Create sample data for testing"""
        data = {
            'Mi_instrumento': ['Instrumento1', 'Instrumento1', 'Instrumento2'],
            'Nivel_escolar': ['3° Básico', '6° Básico', '3° Básico'],
            'Mis_items': ['item1', 'item2', 'item3'],
            'las_claves': ['A', 'B', 'C'],
            'los_invertidos': [0, 1, 0],
            'el_texto_del_item': ['Pregunta 1', 'Pregunta 2', 'Pregunta 3'],
            'Dimensión_del_item': ['Geografia', 'Matematicas', 'Arte'],
            'variable_extra': ['extra1', 'extra2', 'extra3']
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
            other_vars=['variable_extra']
        )
    
    def test_normalize_column_names(self, sample_data, sample_categorization):
        """Test column name normalization"""
        normalizer = DataNormalizer()
        normalized_data, name_mapping = normalizer.normalize_column_names(
            sample_data, sample_categorization
        )
        
        # Check that all original columns are mapped
        assert len(name_mapping) == len(sample_data.columns)
        
        # Check instrument variables naming
        assert 'Mi_instrumento' in name_mapping
        assert 'Nivel_escolar' in name_mapping
        assert name_mapping['Mi_instrumento'] == 'var_instrumento1'
        assert name_mapping['Nivel_escolar'] == 'var_instrumento2'
        
        # Check item ID variable naming
        assert 'Mis_items' in name_mapping
        assert name_mapping['Mis_items'] == 'id_item'
        
        # Check metadata variables naming
        assert 'las_claves' in name_mapping
        assert 'los_invertidos' in name_mapping
        assert name_mapping['las_claves'] == 'var_metadata1'
        assert name_mapping['los_invertidos'] == 'var_metadata2'
        
        # Check classification variables naming
        assert 'el_texto_del_item' in name_mapping
        assert 'Dimensión_del_item' in name_mapping
        assert name_mapping['el_texto_del_item'] == 'var_clasificacion1'
        assert name_mapping['Dimensión_del_item'] == 'var_clasificacion2'
        
        # Check other variables naming
        assert 'variable_extra' in name_mapping
        assert name_mapping['variable_extra'] == 'var_otra1'
        
        # Check that normalized data has correct column names
        expected_columns = set(name_mapping.values())
        actual_columns = set(normalized_data.columns)
        assert expected_columns == actual_columns
        
        # Check that data content is preserved
        assert len(normalized_data) == len(sample_data)
        assert normalized_data['id_item'].tolist() == sample_data['Mis_items'].tolist()
    
    def test_create_mapping_sheet(self, sample_categorization):
        """Test mapping sheet creation"""
        normalizer = DataNormalizer()
        
        # Create a sample name mapping
        name_mapping = {
            'Mi_instrumento': 'var_instrumento1',
            'Nivel_escolar': 'var_instrumento2',
            'Mis_items': 'id_item',
            'las_claves': 'var_metadata1',
            'los_invertidos': 'var_metadata2',
            'el_texto_del_item': 'var_clasificacion1',
            'Dimensión_del_item': 'var_clasificacion2',
            'variable_extra': 'var_otra1'
        }
        
        mapping_sheet = normalizer.create_mapping_sheet(name_mapping, sample_categorization)
        
        # Check that mapping sheet has correct structure
        expected_columns = ['nombre_original', 'nombre_normalizado', 'categoria', 'descripcion_categoria']
        assert list(mapping_sheet.columns) == expected_columns
        
        # Check that all variables are included
        assert len(mapping_sheet) == len(name_mapping)
        
        # Check that categories are correctly assigned
        instrument_rows = mapping_sheet[mapping_sheet['categoria'] == 'Instrumento']
        assert len(instrument_rows) == 2
        assert 'Mi_instrumento' in instrument_rows['nombre_original'].values
        assert 'Nivel_escolar' in instrument_rows['nombre_original'].values
        
        item_id_rows = mapping_sheet[mapping_sheet['categoria'] == 'Identificador de Ítem']
        assert len(item_id_rows) == 1
        assert 'Mis_items' in item_id_rows['nombre_original'].values
        
        metadata_rows = mapping_sheet[mapping_sheet['categoria'] == 'Metadata de Ítem']
        assert len(metadata_rows) == 2
        
        classification_rows = mapping_sheet[mapping_sheet['categoria'] == 'Clasificación de Ítem']
        assert len(classification_rows) == 2
        
        other_rows = mapping_sheet[mapping_sheet['categoria'] == 'Otras Variables']
        assert len(other_rows) == 1
    
    def test_export_normalized_data(self, sample_data, sample_categorization):
        """Test Excel export functionality"""
        normalizer = DataNormalizer()
        
        # Normalize data
        normalized_data, name_mapping = normalizer.normalize_column_names(
            sample_data, sample_categorization
        )
        
        # Create mapping sheet
        mapping_sheet = normalizer.create_mapping_sheet(name_mapping, sample_categorization)
        
        # Export to Excel buffer
        excel_buffer = normalizer.export_normalized_data(normalized_data, mapping_sheet)
        
        # Check that buffer is created and has content
        assert isinstance(excel_buffer, BytesIO)
        assert excel_buffer.getvalue()  # Should have content
        
        # Try to read the Excel file back
        excel_buffer.seek(0)
        
        # Read the sheets
        with pd.ExcelFile(excel_buffer) as excel_file:
            sheet_names = excel_file.sheet_names
            
            # Should have expected sheets
            assert 'Datos_Normalizados' in sheet_names
            assert 'Mapeo_Variables' in sheet_names
            assert 'Resumen' in sheet_names
            
            # Read normalized data sheet
            normalized_read = pd.read_excel(excel_file, sheet_name='Datos_Normalizados')
            assert len(normalized_read) == len(normalized_data)
            assert list(normalized_read.columns) == list(normalized_data.columns)
            
            # Read mapping sheet
            mapping_read = pd.read_excel(excel_file, sheet_name='Mapeo_Variables')
            assert len(mapping_read) == len(mapping_sheet)
            assert list(mapping_read.columns) == list(mapping_sheet.columns)
            
            # Read summary sheet
            summary_read = pd.read_excel(excel_file, sheet_name='Resumen')
            assert len(summary_read) > 0  # Should have summary data
    
    def test_create_enhanced_names(self, sample_categorization):
        """Test enhanced naming functionality"""
        normalizer = DataNormalizer()
        
        # Test with variables that match common patterns
        original_names = [
            'instrumento', 'sector', 'nivel',  # Should match instrument patterns
            'item_id', 'codigo',  # Should match item ID patterns
            'clave', 'invertido', 'dificultad',  # Should match metadata patterns
            'dimension', 'competencia', 'texto',  # Should match classification patterns
            'random_var'  # Should use fallback
        ]
        
        # Create categorization with these variables
        enhanced_categorization = VariableCategorization(
            instrument_vars=['instrumento', 'sector', 'nivel'],
            item_id_vars=['item_id', 'codigo'],
            metadata_vars=['clave', 'invertido', 'dificultad'],
            classification_vars=['dimension', 'competencia', 'texto'],
            other_vars=['random_var']
        )
        
        enhanced_mapping = normalizer.create_enhanced_names(
            enhanced_categorization, original_names
        )
        
        # Check enhanced naming
        assert enhanced_mapping['instrumento'] == 'instrumento'
        assert enhanced_mapping['sector'] == 'sector'
        assert enhanced_mapping['nivel'] == 'nivel'
        
        assert enhanced_mapping['item_id'] == 'id_item'
        assert enhanced_mapping['codigo'] == 'codigo_item'
        
        assert enhanced_mapping['clave'] == 'clave'
        assert enhanced_mapping['invertido'] == 'invertido'
        assert enhanced_mapping['dificultad'] == 'dificultad'
        
        assert enhanced_mapping['dimension'] == 'dimension'
        assert enhanced_mapping['competencia'] == 'competencia'
        assert enhanced_mapping['texto'] == 'texto_pregunta'
        
        # Random variable should use fallback
        assert enhanced_mapping['random_var'] == 'var_otra1'
    
    def test_empty_categorization(self):
        """Test normalization with empty categorization"""
        normalizer = DataNormalizer()
        
        # Create data with no categorization
        data = pd.DataFrame({
            'var1': [1, 2, 3],
            'var2': ['a', 'b', 'c']
        })
        
        empty_categorization = VariableCategorization()
        
        normalized_data, name_mapping = normalizer.normalize_column_names(
            data, empty_categorization
        )
        
        # Should return original data unchanged
        assert list(normalized_data.columns) == list(data.columns)
        assert len(name_mapping) == 0
    
    def test_missing_variables_in_data(self, sample_categorization):
        """Test normalization when categorized variables are missing from data"""
        normalizer = DataNormalizer()
        
        # Create data missing some categorized variables
        incomplete_data = pd.DataFrame({
            'Mi_instrumento': ['Instrumento1', 'Instrumento2'],
            'Mis_items': ['item1', 'item2'],
            # Missing other variables from categorization
        })
        
        normalized_data, name_mapping = normalizer.normalize_column_names(
            incomplete_data, sample_categorization
        )
        
        # Should only normalize variables that exist in data
        assert len(name_mapping) == 2
        assert 'Mi_instrumento' in name_mapping
        assert 'Mis_items' in name_mapping
        
        # Should not include missing variables
        assert 'las_claves' not in name_mapping
        assert 'el_texto_del_item' not in name_mapping