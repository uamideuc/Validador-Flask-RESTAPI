"""
Exportador de reportes PDF - Componente modular del ToolKit
"""
import os
import tempfile
import json
from typing import Dict, Any
from datetime import datetime
from io import BytesIO


class PDFReportExporter:
    """Exportador específico para reportes PDF de validación con tablas detalladas"""
    
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.db = self._get_db_manager()
    
    def export(self, validation_session_id: int) -> Dict[str, Any]:
        """
        Exportar reporte PDF de validación con secciones detalladas
        """
        try:
            # Get validation session
            validation_session = self.db.get_validation_session(validation_session_id)
            if not validation_session:
                return {
                    'success': False,
                    'error': 'Sesión de validación no encontrada'
                }
            
            validation_results = validation_session['validation_results']
            if isinstance(validation_results, str):
                validation_results = json.loads(validation_results)
            
            filename = f"validation_report_{validation_session_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            temp_dir = tempfile.gettempdir()
            file_path = os.path.join(temp_dir, filename)
            
            buffer = self._generate_pdf_buffer(validation_results)
            
            with open(file_path, 'wb') as f:
                f.write(buffer.getvalue())
            
            # Registrar en database
            export_id = self.db.create_export_record(
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
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Error en exportación PDF: {str(e)}'
            }
    
    def _generate_pdf_buffer(self, validation_data):
        """Generar buffer PDF con todas las secciones detalladas"""
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_CENTER
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72,
                              topMargin=72, bottomMargin=18)
        
        styles = getSampleStyleSheet()
        styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=colors.darkblue
        ))
        
        styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=styles['Heading2'],
            fontSize=16,
            spaceAfter=12,
            spaceBefore=20,
            textColor=colors.darkblue
        ))
        
        styles.add(ParagraphStyle(
            name='SubHeader',
            parent=styles['Heading3'],
            fontSize=14,
            spaceAfter=8,
            spaceBefore=12,
            textColor=colors.darkgreen
        ))
        
        # Build story content
        story = []
        
        # Title
        story.append(Paragraph("Reporte de Validación de Instrumentos", styles['CustomTitle']))
        story.append(Spacer(1, 20))
        
        # Summary section
        summary = validation_data.get('summary', {})
        story.extend(self._create_summary_section(summary, styles))
        
        # Duplicate validation section  
        duplicate_validation = validation_data.get('duplicate_validation', {})
        story.extend(self._create_duplicate_section(duplicate_validation, styles))
        
        # Metadata validation section
        metadata_validation = validation_data.get('metadata_validation', {})
        story.extend(self._create_metadata_section(metadata_validation, styles))
        
        # Classification validation section
        classification_validation = validation_data.get('classification_validation', {})
        story.extend(self._create_classification_section(classification_validation, styles))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        return buffer
    
    def _create_summary_section(self, summary, styles):
        """Crear sección de resumen"""
        from reportlab.platypus import Paragraph, Spacer, Table, TableStyle
        from reportlab.lib import colors
        from reportlab.lib.units import inch
        
        story = []
        story.append(Paragraph("Resumen General", styles['SectionHeader']))
        
        data = [
            ['Métrica', 'Valor'],
            ['Total de Ítems', str(summary.get('total_items', 0))],
            ['Total de Instrumentos', str(summary.get('total_instruments', 0))],
            ['Estado de Validación', summary.get('validation_status', 'Desconocido').upper()],
            ['Fecha de Análisis', datetime.now().strftime('%d/%m/%Y %H:%M')]
        ]
        
        table = Table(data, colWidths=[3*inch, 2*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(table)
        story.append(Spacer(1, 20))
        return story
    
    def _create_duplicate_section(self, duplicate_validation, styles):
        """Crear sección de duplicados"""
        from reportlab.platypus import Paragraph, Spacer, Table, TableStyle
        from reportlab.lib import colors
        from reportlab.lib.units import inch
        
        story = []
        story.append(Paragraph("Validación de Duplicados", styles['SectionHeader']))
        
        is_valid = duplicate_validation.get('is_valid', True)
        duplicate_items = duplicate_validation.get('duplicate_items', [])
        
        if is_valid and len(duplicate_items) == 0:
            story.append(Paragraph("✓ <font color='green'>No se encontraron ítems duplicados</font>", 
                                 styles['Normal']))
        else:
            story.append(Paragraph(f"⚠ <font color='red'>Se encontraron {len(duplicate_items)} ítems duplicados</font>", 
                                 styles['Normal']))
            
            if duplicate_items:
                story.append(Spacer(1, 10))
                story.append(Paragraph("Detalle de Ítems Duplicados:", styles['SectionHeader']))
                
                data = [['ID del Ítem', 'Instrumento', 'Filas Afectadas']]
                
                for item in duplicate_items[:10]:
                    instrument_info = []
                    for key, value in item.get('instrument_combination', {}).items():
                        instrument_info.append(f"{key}: {value}")
                    
                    data.append([
                        str(item.get('item_id', '')),
                        ', '.join(instrument_info),
                        ', '.join(map(str, item.get('row_indices', [])))
                    ])
                
                if len(duplicate_items) > 10:
                    data.append(['...', f'Y {len(duplicate_items) - 10} más', '...'])
                
                table = Table(data, colWidths=[1.5*inch, 3*inch, 1.5*inch])
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 10),
                    ('FONTSIZE', (0, 1), (-1, -1), 8),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black)
                ]))
                
                story.append(table)
        
        story.append(Spacer(1, 20))
        return story
    
    def _create_metadata_section(self, metadata_validation, styles):
        """Crear sección de metadata"""
        from reportlab.platypus import Paragraph, Spacer, Table, TableStyle
        from reportlab.lib import colors
        from reportlab.lib.units import inch
        
        story = []
        story.append(Paragraph("Validación de Metadata", styles['SectionHeader']))
        
        is_valid = metadata_validation.get('is_valid', True)
        completeness_stats = metadata_validation.get('completeness_stats', {})
        
        if is_valid:
            story.append(Paragraph("✓ <font color='green'>Todas las variables de metadata están completas</font>", 
                                 styles['Normal']))
        else:
            story.append(Paragraph("⚠ <font color='orange'>Se encontraron problemas en variables de metadata</font>", 
                                 styles['Normal']))
        
        if completeness_stats:
            story.append(Spacer(1, 10))
            story.append(Paragraph("Completitud por Variable:", styles['SectionHeader']))
            
            data = [['Variable', 'Completitud (%)', 'Estado']]
            for variable, percentage in completeness_stats.items():
                status = "✓" if percentage == 100 else "⚠" if percentage >= 95 else "✗"
                color = "green" if percentage == 100 else "orange" if percentage >= 95 else "red"
                data.append([
                    variable,
                    f"{percentage}%",
                    f"<font color='{color}'>{status}</font>"
                ])
            
            table = Table(data, colWidths=[2.5*inch, 1.5*inch, 1*inch])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(table)
        
        story.append(Spacer(1, 20))
        return story
    
    def _create_classification_section(self, classification_validation, styles):
        """Crear sección de clasificación"""
        from reportlab.platypus import Paragraph, Spacer, Table, TableStyle
        from reportlab.lib import colors
        from reportlab.lib.units import inch
        
        story = []
        story.append(Paragraph("Análisis de Variables de Clasificación", styles['SectionHeader']))
        
        statistics = classification_validation.get('statistics', {})
        unique_counts = classification_validation.get('unique_counts_per_instrument', {})
        
        if statistics:
            avg_completeness = statistics.get('average_completeness', 0)
            total_empty = statistics.get('total_empty_cells', 0)
            
            story.append(Paragraph(f"Completitud promedio: {avg_completeness:.1f}%", styles['Normal']))
            story.append(Paragraph(f"Total de celdas vacías: {total_empty}", styles['Normal']))
        
        if unique_counts:
            story.append(Spacer(1, 10))
            story.append(Paragraph("Valores Únicos por Instrumento:", styles['SectionHeader']))
            
            for instrument, variables in list(unique_counts.items())[:3]:  # Limit to first 3 instruments
                story.append(Paragraph(f"<b>{instrument}</b>", styles['Normal']))
                
                data = [['Variable', 'Valores Únicos']]
                for variable, count in variables.items():
                    data.append([variable, str(count)])
                
                table = Table(data, colWidths=[3*inch, 1.5*inch])
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 9),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black)
                ]))
                
                story.append(table)
                story.append(Spacer(1, 10))
        
        return story
    
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