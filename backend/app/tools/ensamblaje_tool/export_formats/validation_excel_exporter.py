"""
Exportador de Excel de validación - Componente modular del ToolKit
"""
import pandas as pd
import os
import tempfile
import json
from typing import Dict, Any
from datetime import datetime
from ....core.models import VariableCategorization


class ValidationExcelExporter:
    """Exportador específico para Excel de validación con anotaciones y errores detallados"""
    
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.db = self._get_db_manager()
    
    def export(self, validation_session_id: int) -> Dict[str, Any]:
        """
        Exportar Excel de validación con datos anotados y sheets de errores detallados
        """
        try:
            # Get validation session data
            validation_session = self.db.get_validation_session(validation_session_id)
            if not validation_session:
                return {
                    'success': False,
                    'error': 'Sesión de validación no encontrada'
                }
            
            # Load original data and validation results
            validation_results = validation_session['validation_results']
            if isinstance(validation_results, str):
                validation_results = json.loads(validation_results)
            
            # Load original data from file
            original_file_path = validation_session['file_path']
            if original_file_path.endswith('.csv'):
                original_data = pd.read_csv(original_file_path)
            else:
                original_data = pd.read_excel(original_file_path)
            
            categorization_dict = validation_session['categorization']
            if isinstance(categorization_dict, str):
                categorization_dict = json.loads(categorization_dict)
            categorization = VariableCategorization(**categorization_dict)
            
            # Create Excel with validation annotations
            filename = f"validation_excel_{validation_session_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
            temp_dir = tempfile.gettempdir()
            file_path = os.path.join(temp_dir, filename)
            
            annotated_data = self._create_annotated_data(original_data, validation_results)
            mapping_df = self._create_mapping_df(categorization)
            
            with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
                # Sheet 1: Datos originales anotados
                annotated_data.to_excel(writer, sheet_name='Datos_Originales_Anotados', index=False)
                
                # Sheet 2: Resumen validación
                validation_summary = self._create_validation_summary_sheet(validation_results, mapping_df)
                validation_summary.to_excel(writer, sheet_name='Resumen_Validacion', index=False)
                
                # Sheet 3: Items duplicados (si existen)
                if validation_results.get('duplicate_validation', {}).get('duplicate_items'):
                    duplicates_df = self._create_duplicates_sheet(validation_results['duplicate_validation'])
                    duplicates_df.to_excel(writer, sheet_name='Items_Duplicados', index=False)
                
                # Sheet 4: Problemas metadata (si existen)
                metadata_issues = self._create_metadata_issues_sheet(validation_results.get('metadata_validation', {}))
                if not metadata_issues.empty:
                    metadata_issues.to_excel(writer, sheet_name='Problemas_Metadata', index=False)
            
            # Registrar en database
            export_id = self.db.create_export_record(
                validation_session_id=validation_session_id,
                session_id=self.session_id,
                export_type='validation_excel',
                file_path=file_path
            )
            
            return {
                'success': True,
                'export_id': export_id,
                'filename': filename,
                'file_path': file_path,
                'export_type': 'validation_excel'
            }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Error en exportación Excel: {str(e)}'
            }
    
    def _create_annotated_data(self, original_data, validation_report):
        """Crear datos anotados con columna ESTADO_VALIDACION"""
        annotated_data = original_data.copy()
        annotated_data['ESTADO_VALIDACION'] = 'OK'
        
        # Marcar duplicados
        duplicate_validation = validation_report.get('duplicate_validation', {})
        if duplicate_validation.get('duplicate_items'):
            for duplicate_item in duplicate_validation['duplicate_items']:
                row_indices = duplicate_item.get('row_indices', [])
                for idx in row_indices:
                    if idx < len(annotated_data):
                        annotated_data.loc[idx, 'ESTADO_VALIDACION'] = 'DUPLICADO'
        
        # Marcar problemas metadata
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
    
    def _create_mapping_df(self, categorization):
        """Crear DataFrame de mapeo de variables"""
        mapping_data = []
        for i, var in enumerate(categorization.instrument_vars, 1):
            mapping_data.append({'Variable_Original': var, 'Variable_Normalizada': f'var_instrumento{i}', 'Categoria': 'Instrumento'})
        for i, var in enumerate(categorization.item_id_vars, 1):
            mapping_data.append({'Variable_Original': var, 'Variable_Normalizada': f'id_item{i}', 'Categoria': 'ID Item'})
        for i, var in enumerate(categorization.metadata_vars, 1):
            mapping_data.append({'Variable_Original': var, 'Variable_Normalizada': f'var_metadata{i}', 'Categoria': 'Metadata'})
        for i, var in enumerate(categorization.classification_vars, 1):
            mapping_data.append({'Variable_Original': var, 'Variable_Normalizada': f'var_clasificacion{i}', 'Categoria': 'Clasificación'})
        return pd.DataFrame(mapping_data)
    
    def _create_validation_summary_sheet(self, validation_report, mapping):
        """Crear sheet de resumen de validación"""
        summary_info = []
        
        summary = validation_report.get('summary', {})
        summary_info.append(['Métrica', 'Valor'])
        summary_info.append(['Total de ítems', summary.get('total_items', 0)])
        summary_info.append(['Total de instrumentos', summary.get('total_instruments', 0)])
        summary_info.append(['Estado general', summary.get('validation_status', 'desconocido')])
        summary_info.append(['Fecha de validación', datetime.now().strftime('%Y-%m-%d %H:%M:%S')])
        summary_info.append(['', ''])
        
        duplicate_validation = validation_report.get('duplicate_validation', {})
        summary_info.append(['Validación de Duplicados', ''])
        summary_info.append(['Estado', 'VÁLIDO' if duplicate_validation.get('is_valid', True) else 'ERRORES'])
        summary_info.append(['Ítems duplicados encontrados', len(duplicate_validation.get('duplicate_items', []))])
        summary_info.append(['', ''])
        
        metadata_validation = validation_report.get('metadata_validation', {})
        summary_info.append(['Validación de Metadata', ''])
        summary_info.append(['Estado', 'VÁLIDO' if metadata_validation.get('is_valid', True) else 'ERRORES'])
        if metadata_validation.get('statistics', {}).get('average_completeness'):
            summary_info.append(['Completitud promedio', f"{metadata_validation['statistics']['average_completeness']}%"])
        
        return pd.DataFrame(summary_info)
    
    def _create_duplicates_sheet(self, duplicate_validation):
        """Crear sheet con detalles de items duplicados"""
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
    
    def _create_metadata_issues_sheet(self, metadata_validation):
        """Crear sheet con problemas de metadata"""
        issues_data = []
        
        missing_values = metadata_validation.get('missing_values', {})
        for variable, missing_indices in missing_values.items():
            for idx in missing_indices:
                issues_data.append({
                    'Variable': variable,
                    'Fila': idx + 1,  # Adjust for 1-based indexing in Excel sheets.
                    'Problema': 'Valor faltante',
                    'Severidad': 'Error'
                })
        
        return pd.DataFrame(issues_data)
    
    def _get_db_manager(self):
        """Get database manager instance"""
        from flask import current_app
        if current_app.config.get('TESTING'):
            from ....core.database import DatabaseManager
            db_path = current_app.config.get('DATABASE_PATH', 'test.db')
            return DatabaseManager(db_path)
        else:
            from ....core.database import db_manager
            return db_manager
