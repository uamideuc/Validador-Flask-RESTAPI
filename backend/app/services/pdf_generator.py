"""
PDF report generator service
"""
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from io import BytesIO
from datetime import datetime
from typing import Dict, Any

class PDFReportGenerator:
    """Service for generating PDF validation reports"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom paragraph styles"""
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=colors.darkblue
        ))
        
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=16,
            spaceAfter=12,
            spaceBefore=20,
            textColor=colors.darkblue
        ))
        
        self.styles.add(ParagraphStyle(
            name='SubHeader',
            parent=self.styles['Heading3'],
            fontSize=14,
            spaceAfter=8,
            spaceBefore=12,
            textColor=colors.darkgreen
        ))
    
    def generate_validation_report(self, validation_data: Dict[str, Any]) -> BytesIO:
        """Generate a comprehensive PDF validation report"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72,
                              topMargin=72, bottomMargin=18)
        
        # Build the story (content)
        story = []
        
        # Title
        story.append(Paragraph("Reporte de Validación de Instrumentos", self.styles['CustomTitle']))
        story.append(Spacer(1, 20))
        
        # Summary section
        summary = validation_data.get('summary', {})
        story.extend(self._create_summary_section(summary))
        
        # Duplicate validation section
        duplicate_validation = validation_data.get('duplicate_validation', {})
        story.extend(self._create_duplicate_section(duplicate_validation))
        
        # Metadata validation section
        metadata_validation = validation_data.get('metadata_validation', {})
        story.extend(self._create_metadata_section(metadata_validation))
        
        # Classification validation section
        classification_validation = validation_data.get('classification_validation', {})
        story.extend(self._create_classification_section(classification_validation))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        return buffer
    
    def _create_summary_section(self, summary: Dict[str, Any]) -> list:
        """Create summary section"""
        story = []
        story.append(Paragraph("Resumen General", self.styles['SectionHeader']))
        
        # Summary table
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
    
    def _create_duplicate_section(self, duplicate_validation: Dict[str, Any]) -> list:
        """Create duplicate validation section"""
        story = []
        story.append(Paragraph("Validación de Duplicados", self.styles['SectionHeader']))
        
        is_valid = duplicate_validation.get('is_valid', True)
        duplicate_items = duplicate_validation.get('duplicate_items', [])
        
        if is_valid and len(duplicate_items) == 0:
            story.append(Paragraph("✓ <font color='green'>No se encontraron ítems duplicados</font>", 
                                 self.styles['Normal']))
        else:
            story.append(Paragraph(f"⚠ <font color='red'>Se encontraron {len(duplicate_items)} ítems duplicados</font>", 
                                 self.styles['Normal']))
            
            if duplicate_items:
                story.append(Spacer(1, 10))
                story.append(Paragraph("Detalle de Ítems Duplicados:", self.styles['SubHeader']))
                
                # Create table for duplicates
                data = [['ID del Ítem', 'Instrumento', 'Filas Afectadas']]
                
                for item in duplicate_items[:10]:  # Limit to first 10 for space
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
    
    def _create_metadata_section(self, metadata_validation: Dict[str, Any]) -> list:
        """Create metadata validation section"""
        story = []
        story.append(Paragraph("Validación de Metadata", self.styles['SectionHeader']))
        
        is_valid = metadata_validation.get('is_valid', True)
        completeness_stats = metadata_validation.get('completeness_stats', {})
        unique_values_summary = metadata_validation.get('unique_values_summary', {})
        
        if is_valid:
            story.append(Paragraph("✓ <font color='green'>Todas las variables de metadata están completas</font>", 
                                 self.styles['Normal']))
        else:
            story.append(Paragraph("⚠ <font color='orange'>Se encontraron problemas en variables de metadata</font>", 
                                 self.styles['Normal']))
        
        if completeness_stats:
            story.append(Spacer(1, 10))
            story.append(Paragraph("Completitud por Variable:", self.styles['SubHeader']))
            
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
    
    def _create_classification_section(self, classification_validation: Dict[str, Any]) -> list:
        """Create classification validation section"""
        story = []
        story.append(Paragraph("Análisis de Variables de Clasificación", self.styles['SectionHeader']))
        
        statistics = classification_validation.get('statistics', {})
        unique_counts = classification_validation.get('unique_counts_per_instrument', {})
        
        if statistics:
            avg_completeness = statistics.get('average_completeness', 0)
            total_empty = statistics.get('total_empty_cells', 0)
            
            story.append(Paragraph(f"Completitud promedio: {avg_completeness}%", self.styles['Normal']))
            story.append(Paragraph(f"Total de celdas vacías: {total_empty}", self.styles['Normal']))
        
        if unique_counts:
            story.append(Spacer(1, 10))
            story.append(Paragraph("Valores Únicos por Instrumento:", self.styles['SubHeader']))
            
            for instrument, variables in list(unique_counts.items())[:3]:  # Limit to first 3 instruments
                story.append(Paragraph(f"<b>{instrument}</b>", self.styles['Normal']))
                
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