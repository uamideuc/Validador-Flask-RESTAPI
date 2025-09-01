"""
Exportador de datos normalizados a Excel - Componente modular del ToolKit
"""
import pandas as pd
import os
import tempfile
from typing import Dict, Any
from datetime import datetime
from ....core.models import VariableCategorization


class NormalizedExcelExporter:
    """Exportador específico para datos normalizados a Excel"""
    
    def __init__(self, session_id: str):
        self.session_id = session_id
    
    def export(
        self, 
        data: pd.DataFrame, 
        categorization: VariableCategorization,
        validation_session_id: int
    ) -> Dict[str, Any]:
        """
        Exportar datos normalizados a Excel con sheet de mapeo
        """
        try:
            # Normalizar nombres de columnas
            normalized_data = data.copy()
            name_mapping = self._normalize_column_names(normalized_data, categorization)
            
            # Crear Excel con 2 sheets
            filename = f"normalized_data_{validation_session_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
            temp_dir = tempfile.gettempdir()
            file_path = os.path.join(temp_dir, filename)
            
            with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
                # Sheet 1: Datos normalizados
                normalized_data.to_excel(writer, sheet_name='Datos_Normalizados', index=False)
                
                # Sheet 2: Mapeo de nombres
                mapping_df = self._create_mapping_dataframe(name_mapping, categorization)
                mapping_df.to_excel(writer, sheet_name='Mapeo_Variables', index=False)
            
            db = self._get_db_manager()
            export_id = db.create_export_record(
                validation_session_id=validation_session_id,
                session_id=self.session_id,
                export_type='normalized_xlsx',
                file_path=file_path
            )
            
            return {
                'success': True,
                'export_id': export_id,
                'filename': filename,
                'file_path': file_path,
                'variables_normalized': len(name_mapping)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _normalize_column_names(self, data: pd.DataFrame, categorization: VariableCategorization) -> Dict[str, str]:
        """Normalizar nombres de columnas y devolver mapeo"""
        name_mapping = {}
        
        # Renombrar variables por categoría
        for i, var in enumerate(categorization.instrument_vars, 1):
            if var in data.columns:
                new_name = f'var_instrumento{i}'
                data.rename(columns={var: new_name}, inplace=True)
                name_mapping[var] = new_name
        
        for i, var in enumerate(categorization.item_id_vars, 1):
            if var in data.columns:
                new_name = f'id_item{i}' if i == 1 else f'id_item{i}'
                data.rename(columns={var: new_name}, inplace=True)
                name_mapping[var] = new_name
        
        for i, var in enumerate(categorization.metadata_vars, 1):
            if var in data.columns:
                new_name = f'var_metadata{i}'
                data.rename(columns={var: new_name}, inplace=True)
                name_mapping[var] = new_name
        
        for i, var in enumerate(categorization.classification_vars, 1):
            if var in data.columns:
                new_name = f'var_clasificacion{i}'
                data.rename(columns={var: new_name}, inplace=True)
                name_mapping[var] = new_name
        
        for i, var in enumerate(categorization.other_vars, 1):
            if var in data.columns:
                new_name = f'var_otra{i}'
                data.rename(columns={var: new_name}, inplace=True)
                name_mapping[var] = new_name
        
        return name_mapping
    
    def _create_mapping_dataframe(self, name_mapping: Dict[str, str], categorization: VariableCategorization) -> pd.DataFrame:
        """Crear DataFrame con el mapeo de variables"""
        mapping_data = []
        
        for original, normalized in name_mapping.items():
            category = self._get_category(original, categorization)
            description = self._get_category_description(category)
            
            mapping_data.append({
                'Variable_Original': original,
                'Variable_Normalizada': normalized,
                'Categoria': category,
                'Descripcion_Categoria': description
            })
        
        return pd.DataFrame(mapping_data)
    
    def _get_category(self, variable: str, categorization: VariableCategorization) -> str:
        """Obtener categoría de una variable"""
        if variable in categorization.instrument_vars:
            return 'Instrumento'
        elif variable in categorization.item_id_vars:
            return 'Identificador de Ítem'
        elif variable in categorization.metadata_vars:
            return 'Metadata de Ítem'
        elif variable in categorization.classification_vars:
            return 'Clasificación de Ítem'
        elif variable in categorization.other_vars:
            return 'Otras Variables'
        return 'Sin categoría'
    
    def _get_category_description(self, category: str) -> str:
        """Obtener descripción de categoría"""
        descriptions = {
            'Instrumento': 'Variables que identifican y distinguen diferentes instrumentos',
            'Identificador de Ítem': 'Variables que identifican únicamente cada ítem',
            'Metadata de Ítem': 'Variables con información técnica del ítem (debe estar completa)',
            'Clasificación de Ítem': 'Variables que clasifican o describen el contenido del ítem',
            'Otras Variables': 'Variables no categorizadas'
        }
        return descriptions.get(category, 'Sin descripción')
    
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