"""
Data normalization and export service
"""
import pandas as pd
from typing import Dict, List, Any, Tuple
from io import BytesIO
import os
from app.models.data_models import VariableCategorization

class DataNormalizer:
    """Service for normalizing column names and exporting data"""
    
    def __init__(self):
        pass
    
    def normalize_column_names(self, data: pd.DataFrame, categorization: VariableCategorization) -> Tuple[pd.DataFrame, Dict[str, str]]:
        """
        Normalize column names according to categorization
        Returns normalized DataFrame and mapping dictionary
        """
        normalized_data = data.copy()
        name_mapping = {}
        
        # Generate normalized names for each category
        
        # Instrument variables
        for i, var in enumerate(categorization.instrument_vars, 1):
            if var in normalized_data.columns:
                new_name = f"var_instrumento{i}"
                normalized_data = normalized_data.rename(columns={var: new_name})
                name_mapping[var] = new_name
        
        # Item ID variables
        for i, var in enumerate(categorization.item_id_vars, 1):
            if var in normalized_data.columns:
                if i == 1:
                    new_name = "id_item"
                else:
                    new_name = f"id_item{i}"
                normalized_data = normalized_data.rename(columns={var: new_name})
                name_mapping[var] = new_name
        
        # Metadata variables
        for i, var in enumerate(categorization.metadata_vars, 1):
            if var in normalized_data.columns:
                new_name = f"var_metadata{i}"
                normalized_data = normalized_data.rename(columns={var: new_name})
                name_mapping[var] = new_name
        
        # Classification variables
        for i, var in enumerate(categorization.classification_vars, 1):
            if var in normalized_data.columns:
                new_name = f"var_clasificacion{i}"
                normalized_data = normalized_data.rename(columns={var: new_name})
                name_mapping[var] = new_name
        
        # Other variables
        for i, var in enumerate(categorization.other_vars, 1):
            if var in normalized_data.columns:
                new_name = f"var_otra{i}"
                normalized_data = normalized_data.rename(columns={var: new_name})
                name_mapping[var] = new_name
        
        return normalized_data, name_mapping
    
    def create_mapping_sheet(self, name_mapping: Dict[str, str], categorization: VariableCategorization) -> pd.DataFrame:
        """
        Create a mapping sheet showing original names, normalized names, and categories
        """
        mapping_data = []
        
        # Helper function to add variables to mapping
        def add_variables_to_mapping(variables: List[str], category: str):
            for var in variables:
                if var in name_mapping:
                    mapping_data.append({
                        'nombre_original': var,
                        'nombre_normalizado': name_mapping[var],
                        'categoria': category,
                        'descripcion_categoria': self._get_category_description(category)
                    })
        
        # Add variables by category
        add_variables_to_mapping(categorization.instrument_vars, 'Instrumento')
        add_variables_to_mapping(categorization.item_id_vars, 'Identificador de Ítem')
        add_variables_to_mapping(categorization.metadata_vars, 'Metadata de Ítem')
        add_variables_to_mapping(categorization.classification_vars, 'Clasificación de Ítem')
        add_variables_to_mapping(categorization.other_vars, 'Otras Variables')
        
        return pd.DataFrame(mapping_data)
    
    def _get_category_description(self, category: str) -> str:
        """Get description for each category"""
        descriptions = {
            'Instrumento': 'Variables que identifican y distinguen diferentes instrumentos',
            'Identificador de Ítem': 'Variables que identifican únicamente cada ítem',
            'Metadata de Ítem': 'Variables con información técnica del ítem (debe estar completa)',
            'Clasificación de Ítem': 'Variables que clasifican o describen el contenido del ítem',
            'Otras Variables': 'Variables no categorizadas'
        }
        return descriptions.get(category, 'Sin descripción')
    
    def export_normalized_data(self, data: pd.DataFrame, mapping: pd.DataFrame, 
                             filename: str = "datos_normalizados.xlsx") -> BytesIO:
        """
        Export normalized data and mapping to Excel file in memory (WITHOUT summary sheet)
        """
        buffer = BytesIO()
        
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            # Write normalized data
            data.to_excel(writer, sheet_name='Datos_Normalizados', index=False)
            
            # Write mapping
            mapping.to_excel(writer, sheet_name='Mapeo_Variables', index=False)
        
        buffer.seek(0)
        return buffer
    
    def export_validation_data(self, original_data: pd.DataFrame, validation_report: Dict[str, Any], 
                             mapping: pd.DataFrame, filename: str = "reporte_validacion.xlsx") -> BytesIO:
        """
        Export original data with validation annotations and summary
        """
        buffer = BytesIO()
        
        # Create annotated data
        annotated_data = self._create_annotated_data(original_data, validation_report)
        
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            # Write original data with annotations
            annotated_data.to_excel(writer, sheet_name='Datos_Originales_Anotados', index=False)
            
            # Write validation summary
            validation_summary = self._create_validation_summary_sheet(validation_report, mapping)
            validation_summary.to_excel(writer, sheet_name='Resumen_Validacion', index=False)
            
            # Write detailed errors if any
            if validation_report.get('duplicate_validation', {}).get('duplicate_items'):
                duplicates_df = self._create_duplicates_sheet(validation_report['duplicate_validation'])
                duplicates_df.to_excel(writer, sheet_name='Items_Duplicados', index=False)
            
            # Write metadata issues if any
            metadata_issues = self._create_metadata_issues_sheet(validation_report.get('metadata_validation', {}))
            if not metadata_issues.empty:
                metadata_issues.to_excel(writer, sheet_name='Problemas_Metadata', index=False)
        
        buffer.seek(0)
        return buffer
    
    def _create_annotated_data(self, original_data: pd.DataFrame, validation_report: Dict[str, Any]) -> pd.DataFrame:
        """Create annotated version of original data with validation flags"""
        annotated_data = original_data.copy()
        
        # Add validation status column
        annotated_data['ESTADO_VALIDACION'] = 'OK'
        
        # Mark duplicate items
        duplicate_validation = validation_report.get('duplicate_validation', {})
        if duplicate_validation.get('duplicate_items'):
            for duplicate_item in duplicate_validation['duplicate_items']:
                row_indices = duplicate_item.get('row_indices', [])
                for idx in row_indices:
                    if idx < len(annotated_data):
                        annotated_data.loc[idx, 'ESTADO_VALIDACION'] = 'DUPLICADO'
        
        # Mark metadata issues
        metadata_validation = validation_report.get('metadata_validation', {})
        if metadata_validation.get('missing_values'):
            for variable, missing_indices in metadata_validation['missing_values'].items():
                for idx in missing_indices:
                    if idx < len(annotated_data):
                        current_status = annotated_data.loc[idx, 'ESTADO_VALIDACION']
                        if current_status == 'OK':
                            annotated_data.loc[idx, 'ESTADO_VALIDACION'] = 'METADATA_FALTANTE'
                        else:
                            annotated_data.loc[idx, 'ESTADO_VALIDACION'] = f'{current_status}+METADATA_FALTANTE'
        
        return annotated_data
    
    def _create_validation_summary_sheet(self, validation_report: Dict[str, Any], mapping: pd.DataFrame) -> pd.DataFrame:
        """Create validation summary sheet"""
        summary_info = []
        
        # Basic statistics
        summary = validation_report.get('summary', {})
        summary_info.append(['Métrica', 'Valor'])
        summary_info.append(['Total de ítems', summary.get('total_items', 0)])
        summary_info.append(['Total de instrumentos', summary.get('total_instruments', 0)])
        summary_info.append(['Estado general', summary.get('validation_status', 'desconocido')])
        summary_info.append(['Fecha de validación', pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')])
        summary_info.append(['', ''])
        
        # Duplicate validation results
        duplicate_validation = validation_report.get('duplicate_validation', {})
        summary_info.append(['Validación de Duplicados', ''])
        summary_info.append(['Estado', 'VÁLIDO' if duplicate_validation.get('is_valid', True) else 'ERRORES'])
        summary_info.append(['Ítems duplicados encontrados', len(duplicate_validation.get('duplicate_items', []))])
        summary_info.append(['', ''])
        
        # Metadata validation results
        metadata_validation = validation_report.get('metadata_validation', {})
        summary_info.append(['Validación de Metadata', ''])
        summary_info.append(['Estado', 'VÁLIDO' if metadata_validation.get('is_valid', True) else 'ERRORES'])
        if metadata_validation.get('statistics', {}).get('average_completeness'):
            summary_info.append(['Completitud promedio', f"{metadata_validation['statistics']['average_completeness']}%"])
        summary_info.append(['', ''])
        
        # Classification validation results
        classification_validation = validation_report.get('classification_validation', {})
        summary_info.append(['Análisis de Clasificación', ''])
        if classification_validation.get('statistics', {}).get('average_completeness'):
            summary_info.append(['Completitud promedio', f"{classification_validation['statistics']['average_completeness']}%"])
        if classification_validation.get('statistics', {}).get('total_empty_cells'):
            summary_info.append(['Celdas vacías', classification_validation['statistics']['total_empty_cells']])
        
        return pd.DataFrame(summary_info)
    
    def _create_duplicates_sheet(self, duplicate_validation: Dict[str, Any]) -> pd.DataFrame:
        """Create sheet with duplicate items details"""
        duplicates_data = []
        
        for item in duplicate_validation.get('duplicate_items', []):
            instrument_info = []
            for key, value in item.get('instrument_combination', {}).items():
                instrument_info.append(f"{key}: {value}")
            
            duplicates_data.append({
                'ID_Item': item.get('item_id', ''),
                'Instrumento': ', '.join(instrument_info),
                'Filas_Afectadas': ', '.join(map(str, item.get('row_indices', []))),
                'Cantidad_Duplicados': len(item.get('row_indices', []))
            })
        
        return pd.DataFrame(duplicates_data)
    
    def _create_metadata_issues_sheet(self, metadata_validation: Dict[str, Any]) -> pd.DataFrame:
        """Create sheet with metadata issues"""
        issues_data = []
        
        missing_values = metadata_validation.get('missing_values', {})
        for variable, missing_indices in missing_values.items():
            for idx in missing_indices:
                issues_data.append({
                    'Variable': variable,
                    'Fila': idx + 1,  # +1 for Excel 1-based indexing
                    'Problema': 'Valor faltante',
                    'Severidad': 'Error'
                })
        
        return pd.DataFrame(issues_data)
    
    def _create_summary_sheet(self, data: pd.DataFrame, mapping: pd.DataFrame) -> pd.DataFrame:
        """Create a summary sheet with basic statistics"""
        summary_info = []
        
        # Basic statistics
        summary_info.append(['Estadística', 'Valor'])
        summary_info.append(['Total de filas (ítems)', len(data)])
        summary_info.append(['Total de columnas (variables)', len(data.columns)])
        summary_info.append(['Variables normalizadas', len(mapping)])
        summary_info.append(['', ''])
        
        # Variables by category
        summary_info.append(['Categoría', 'Cantidad de Variables'])
        category_counts = mapping['categoria'].value_counts()
        for category, count in category_counts.items():
            summary_info.append([category, count])
        
        summary_info.append(['', ''])
        summary_info.append(['Información Adicional', ''])
        summary_info.append(['Fecha de normalización', pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')])
        summary_info.append(['Herramienta', 'Validador de Instrumentos'])
        
        return pd.DataFrame(summary_info)
    
    def save_normalized_file(self, buffer: BytesIO, file_path: str) -> bool:
        """
        Save the normalized data buffer to a file
        """
        try:
            # Ensure directory exists
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            
            with open(file_path, 'wb') as f:
                f.write(buffer.getvalue())
            
            return True
        except Exception as e:
            print(f"Error saving normalized file: {e}")
            return False
    
    def create_enhanced_names(self, categorization: VariableCategorization, 
                            original_names: List[str]) -> Dict[str, str]:
        """
        Create enhanced normalized names based on common patterns
        This is an alternative to the basic normalization
        """
        enhanced_mapping = {}
        
        # Common patterns for instrument variables
        instrument_patterns = {
            'instrumento': 'instrumento',
            'sector': 'sector',
            'forma': 'forma',
            'cuadernillo': 'cuadernillo',
            'nivel': 'nivel',
            'grado': 'grado',
            'curso': 'curso'
        }
        
        # Common patterns for item ID
        item_id_patterns = {
            'item': 'id_item',
            'id': 'id_item',
            'numero': 'numero_item',
            'codigo': 'codigo_item'
        }
        
        # Common patterns for metadata
        metadata_patterns = {
            'clave': 'clave',
            'invertido': 'invertido',
            'ancla': 'ancla',
            'dificultad': 'dificultad',
            'discriminacion': 'discriminacion'
        }
        
        # Common patterns for classification
        classification_patterns = {
            'dimension': 'dimension',
            'subdimension': 'subdimension',
            'competencia': 'competencia',
            'habilidad': 'habilidad',
            'contenido': 'contenido',
            'texto': 'texto_pregunta',
            'enunciado': 'enunciado'
        }
        
        # Apply enhanced naming
        def apply_patterns(variables: List[str], patterns: Dict[str, str], fallback_prefix: str):
            used_names = set()
            for i, var in enumerate(variables):
                var_lower = var.lower()
                
                # Try to match patterns
                matched_name = None
                for pattern, enhanced_name in patterns.items():
                    if pattern in var_lower:
                        if enhanced_name not in used_names:
                            matched_name = enhanced_name
                            used_names.add(enhanced_name)
                            break
                        else:
                            # Add number suffix if name already used
                            counter = 2
                            while f"{enhanced_name}{counter}" in used_names:
                                counter += 1
                            matched_name = f"{enhanced_name}{counter}"
                            used_names.add(matched_name)
                            break
                
                # Use fallback if no pattern matched
                if not matched_name:
                    counter = 1
                    while f"{fallback_prefix}{counter}" in used_names:
                        counter += 1
                    matched_name = f"{fallback_prefix}{counter}"
                    used_names.add(matched_name)
                
                enhanced_mapping[var] = matched_name
        
        # Apply enhanced naming to each category
        apply_patterns(categorization.instrument_vars, instrument_patterns, 'var_instrumento')
        apply_patterns(categorization.item_id_vars, item_id_patterns, 'id_item')
        apply_patterns(categorization.metadata_vars, metadata_patterns, 'var_metadata')
        apply_patterns(categorization.classification_vars, classification_patterns, 'var_clasificacion')
        apply_patterns(categorization.other_vars, {}, 'var_otra')
        
        return enhanced_mapping