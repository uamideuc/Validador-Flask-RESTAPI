"""
Lógica de exportación específica para EnsamblajeToolKit
"""
import pandas as pd
import os
from typing import Dict, Any
from datetime import datetime
from ...core.models import VariableCategorization
from ...core.database import DatabaseManager

class EnsamblajeExporter:
    """Exportador específico para herramienta de ensamblaje"""
    
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.db = DatabaseManager()
    
    def export(
        self, 
        export_type: str, 
        data: pd.DataFrame, 
        categorization: VariableCategorization,
        validation_session_id: int
    ) -> Dict[str, Any]:
        """
        Ejecutar exportación usando servicios reales existentes
        """
        if export_type == 'normalized_xlsx':
            return self._export_normalized_xlsx(data, categorization, validation_session_id)
        elif export_type == 'validation_excel':
            return self._export_validation_excel(validation_session_id)
        elif export_type == 'validation_report_pdf':
            return self._export_validation_report_pdf(validation_session_id)
        else:
            raise ValueError(f"Tipo de exportación no soportado: {export_type}")
    
    def _export_normalized_xlsx(
        self, 
        data: pd.DataFrame, 
        categorization: VariableCategorization,
        validation_session_id: int
    ) -> Dict[str, Any]:
        """Exportar datos normalizados usando DataNormalizer real"""
        from ...services.data_normalizer import DataNormalizer
        
        try:
            normalizer = DataNormalizer()
            normalized_data, name_mapping = normalizer.normalize_column_names(data, categorization)
            mapping_sheet = normalizer.create_mapping_sheet(name_mapping, categorization)
            
            # Export to buffer
            buffer = normalizer.export_normalized_data(normalized_data, mapping_sheet)
            
            # Save to file system  
            filename = f"normalized_data_{validation_session_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
            file_path = os.path.join('exports', filename)
            
            os.makedirs('exports', exist_ok=True)
            success = normalizer.save_normalized_file(buffer, file_path)
            
            if success:
                # Register in database
                export_id = self.db.create_export(
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
                    'export_type': 'normalized_xlsx'
                }
            else:
                return {
                    'success': False,
                    'error': 'Error guardando archivo normalizado'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Error en exportación normalizada: {str(e)}'
            }
    
    def _export_validation_excel(self, validation_session_id: int) -> Dict[str, Any]:
        """Exportar Excel de validación con datos reales"""
        try:
            # Get validation session data
            validation_session = self.db.get_validation_session(validation_session_id)
            if not validation_session:
                return {
                    'success': False,
                    'error': 'Sesión de validación no encontrada'
                }
            
            # Load original data and validation results
            import json
            validation_results = json.loads(validation_session.validation_results)
            
            # Load original data from file
            original_file_path = validation_session.file_path
            if original_file_path.endswith('.csv'):
                original_data = pd.read_csv(original_file_path)
            else:
                original_data = pd.read_excel(original_file_path)
            
            # Get categorization
            categorization_dict = json.loads(validation_session.categorization)
            categorization = VariableCategorization(**categorization_dict)
            
            # Use DataNormalizer to create validation Excel
            from ...services.data_normalizer import DataNormalizer
            normalizer = DataNormalizer()
            _, name_mapping = normalizer.normalize_column_names(original_data, categorization)
            mapping_sheet = normalizer.create_mapping_sheet(name_mapping, categorization)
            
            # Create validation Excel with annotations
            buffer = normalizer.export_validation_data(original_data, validation_results, mapping_sheet)
            
            # Save file
            filename = f"validation_excel_{validation_session_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
            file_path = os.path.join('exports', filename)
            
            os.makedirs('exports', exist_ok=True)
            success = normalizer.save_normalized_file(buffer, file_path)
            
            if success:
                export_id = self.db.create_export(
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
            else:
                return {
                    'success': False,
                    'error': 'Error guardando Excel de validación'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Error en exportación Excel: {str(e)}'
            }
    
    def _export_validation_report_pdf(self, validation_session_id: int) -> Dict[str, Any]:
        """Exportar reporte PDF usando servicio real"""
        try:
            # Get validation session
            validation_session = self.db.get_validation_session(validation_session_id)
            if not validation_session:
                return {
                    'success': False,
                    'error': 'Sesión de validación no encontrada'
                }
            
            # Use PDF generator service
            from ...services.pdf_generator import PDFGenerator
            
            import json
            validation_results = json.loads(validation_session.validation_results)
            
            pdf_generator = PDFGenerator()
            
            # Generate PDF
            filename = f"validation_report_{validation_session_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            file_path = os.path.join('exports', filename)
            
            os.makedirs('exports', exist_ok=True)
            
            success = pdf_generator.generate_validation_report(
                validation_results=validation_results,
                filename=validation_session.filename,
                output_path=file_path
            )
            
            if success:
                export_id = self.db.create_export(
                    validation_session_id=validation_session_id,
                    session_id=self.session_id,
                    export_type='validation_report_pdf',
                    file_path=file_path
                )
                
                return {
                    'success': True,
                    'export_id': export_id,
                    'filename': filename,
                    'file_path': file_path,
                    'export_type': 'validation_report_pdf'
                }
            else:
                return {
                    'success': False,
                    'error': 'Error generando reporte PDF'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Error en exportación PDF: {str(e)}'
            }