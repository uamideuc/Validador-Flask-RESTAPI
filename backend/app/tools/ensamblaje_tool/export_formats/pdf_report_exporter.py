"""
Exportador de Reportes PDF - Versión 2.0 Profesional
Diseño modular con branding institucional y análisis completo
"""
import os
import tempfile
import json
from typing import Dict, Any, List, Tuple
from datetime import datetime
from io import BytesIO

from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.units import inch, cm, mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, KeepTogether, Flowable
)
from reportlab.pdfgen import canvas
from reportlab.graphics.shapes import Drawing, Rect, String, Line
from reportlab.graphics.charts.barcharts import HorizontalBarChart
from reportlab.graphics import renderPDF
from reportlab.lib import colors

# Import brand configuration
from ....core.assets.brand import (
    BRAND_COLORS, TYPOGRAPHY, BRAND_NAME, BRAND_SUBTITLE,
    LOGO_CIRCLE_PATH, LOGO_HORIZONTAL_PATH
)


class NumberedCanvas(canvas.Canvas):
    """Canvas personalizado con numeración de páginas y header/footer"""

    def __init__(self, *args, **kwargs):
        canvas.Canvas.__init__(self, *args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(self._pageNumber, num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_decorations(self, page_num, total_pages):
        """Dibujar header y footer en cada página"""
        page_width, page_height = A4

        # Skip decorations for cover page (page 1)
        if page_num == 1:
            return

        # Header line
        self.setStrokeColor(BRAND_COLORS['divider'])
        self.setLineWidth(0.5)
        self.line(40, page_height - 50, page_width - 40, page_height - 50)

        # Footer
        self.setFont(TYPOGRAPHY['font_family'], TYPOGRAPHY['size_small'])
        self.setFillColor(BRAND_COLORS['text_secondary'])

        # Page number (right)
        self.drawRightString(
            page_width - 40,
            30,
            f"Página {page_num} de {total_pages}"
        )

        # Document title (left)
        self.drawString(
            40,
            30,
            "Reporte de Validación - Centro MIDE"
        )

        # Footer line
        self.setStrokeColor(BRAND_COLORS['divider'])
        self.setLineWidth(0.5)
        self.line(40, 40, page_width - 40, 40)


class PDFReportExporter:
    """Exportador profesional de reportes PDF con diseño modular"""

    def __init__(self, session_id: str):
        self.session_id = session_id
        self.db = self._get_db_manager()
        self.styles = self._create_styles()

    def _add_bookmark(self, story: List, title: str, level: int = 0):
        """Agregar bookmark al PDF para navegación"""
        # Crear un flowable invisible que marca la posición
        class BookmarkFlowable(Flowable):
            def __init__(self, title, level):
                Flowable.__init__(self)
                self.title = title
                self.level = level
                self.height = 0
                self.width = 0

            def draw(self):
                self.canv.bookmarkPage(self.title)
                self.canv.addOutlineEntry(self.title, self.title, level=self.level)

        story.append(BookmarkFlowable(title, level))

    def _create_info_box(self, title: str, content: str, bg_color, text_color=None) -> Table:
        """Crear caja de información destacada"""
        if text_color is None:
            text_color = BRAND_COLORS['surface']

        box_table = Table(
            [[Paragraph(f"<b>{title}</b><br/>{content}", self.styles['Body'])]],
            colWidths=[6.5*inch]
        )
        box_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), bg_color),
            ('TEXTCOLOR', (0, 0), (-1, -1), text_color),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('LEFTPADDING', (0, 0), (-1, -1), 15),
            ('RIGHTPADDING', (0, 0), (-1, -1), 15),
            ('BOX', (0, 0), (-1, -1), 1, BRAND_COLORS['divider']),
        ]))
        return box_table

    def export(self, validation_session_id: int) -> Dict[str, Any]:
        """
        Exportar reporte PDF profesional de validación
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

            categorization_dict = validation_session['categorization']
            if isinstance(categorization_dict, str):
                categorization_dict = json.loads(categorization_dict)

            filename = f"reporte_validacion_{validation_session_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            temp_dir = tempfile.gettempdir()
            file_path = os.path.join(temp_dir, filename)

            # Generate PDF
            buffer = self._generate_pdf_buffer(validation_results, categorization_dict)

            with open(file_path, 'wb') as f:
                f.write(buffer.getvalue())

            # Register in database
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
            import traceback
            return {
                'success': False,
                'error': f'Error en exportación PDF: {str(e)}',
                'traceback': traceback.format_exc()
            }

    def _generate_pdf_buffer(self, validation_data: Dict, categorization: Dict) -> BytesIO:
        """Generar buffer PDF con diseño profesional completo"""
        buffer = BytesIO()

        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=40,
            leftMargin=40,
            topMargin=60,
            bottomMargin=60
        )

        # Build story content
        story = []

        # 1. Cover page
        story.extend(self._create_cover_page(validation_data))
        story.append(PageBreak())

        # 2. Table of contents
        story.extend(self._create_table_of_contents())
        story.append(PageBreak())

        # 3. Executive summary
        story.extend(self._create_executive_summary(validation_data, categorization))
        story.append(PageBreak())

        # 4. Variable categorization
        story.extend(self._create_categorization_section(categorization))
        story.append(PageBreak())

        # 5. Instrument validation
        story.extend(self._create_instrument_validation_section(validation_data))

        # 6. Duplicate validation
        story.extend(self._create_duplicate_validation_section(validation_data))
        story.append(PageBreak())

        # 7. Metadata validation
        story.extend(self._create_metadata_validation_section(validation_data))
        story.append(PageBreak())

        # 8. Classification analysis
        story.extend(self._create_classification_section(validation_data))
        story.append(PageBreak())

        # 9. Instrument-by-instrument analysis
        story.extend(self._create_per_instrument_analysis(validation_data, categorization))
        story.append(PageBreak())

        # 10. Conclusions and recommendations
        story.extend(self._create_conclusions_section(validation_data))

        # Build PDF with custom canvas
        doc.build(story, canvasmaker=NumberedCanvas)
        buffer.seek(0)
        return buffer

    def _create_styles(self) -> Dict[str, ParagraphStyle]:
        """Crear estilos personalizados para el PDF"""
        base_styles = getSampleStyleSheet()
        styles = {}

        # Title (portada)
        styles['Title'] = ParagraphStyle(
            'CustomTitle',
            parent=base_styles['Title'],
            fontName=TYPOGRAPHY['font_family_bold'],
            fontSize=TYPOGRAPHY['size_title'],
            textColor=BRAND_COLORS['primary'],
            spaceAfter=20,
            alignment=TA_CENTER,
            leading=28
        )

        # Subtitle
        styles['Subtitle'] = ParagraphStyle(
            'Subtitle',
            parent=base_styles['Normal'],
            fontName=TYPOGRAPHY['font_family'],
            fontSize=14,
            textColor=BRAND_COLORS['text_secondary'],
            spaceAfter=10,
            alignment=TA_CENTER
        )

        # Heading 1
        styles['Heading1'] = ParagraphStyle(
            'CustomHeading1',
            parent=base_styles['Heading1'],
            fontName=TYPOGRAPHY['font_family_bold'],
            fontSize=TYPOGRAPHY['size_h1'],
            textColor=BRAND_COLORS['primary'],
            spaceAfter=15,
            spaceBefore=20,
            leading=22
        )

        # Heading 2
        styles['Heading2'] = ParagraphStyle(
            'CustomHeading2',
            parent=base_styles['Heading2'],
            fontName=TYPOGRAPHY['font_family_bold'],
            fontSize=TYPOGRAPHY['size_h2'],
            textColor=BRAND_COLORS['primary_dark'],
            spaceAfter=12,
            spaceBefore=18,
            leading=18
        )

        # Heading 3
        styles['Heading3'] = ParagraphStyle(
            'CustomHeading3',
            parent=base_styles['Heading3'],
            fontName=TYPOGRAPHY['font_family_bold'],
            fontSize=TYPOGRAPHY['size_h3'],
            textColor=BRAND_COLORS['text_primary'],
            spaceAfter=10,
            spaceBefore=12,
            leading=14
        )

        # Body text
        styles['Body'] = ParagraphStyle(
            'CustomBody',
            parent=base_styles['Normal'],
            fontName=TYPOGRAPHY['font_family'],
            fontSize=TYPOGRAPHY['size_body'],
            textColor=BRAND_COLORS['text_primary'],
            spaceAfter=8,
            leading=16,
            alignment=TA_LEFT
        )

        # Body Justified
        styles['BodyJustified'] = ParagraphStyle(
            'BodyJustified',
            parent=base_styles['Normal'],
            fontName=TYPOGRAPHY['font_family'],
            fontSize=TYPOGRAPHY['size_body'],
            textColor=BRAND_COLORS['text_primary'],
            spaceAfter=8,
            leading=16,
            alignment=TA_JUSTIFY
        )

        # Cell text (for tables)
        styles['CellText'] = ParagraphStyle(
            'CellText',
            parent=base_styles['Normal'],
            fontName=TYPOGRAPHY['font_family'],
            fontSize=TYPOGRAPHY['size_small'],
            textColor=BRAND_COLORS['text_primary'],
            leading=12,
            wordWrap='CJK'
        )

        # TOC entry
        styles['TOC'] = ParagraphStyle(
            'TOC',
            parent=base_styles['Normal'],
            fontName=TYPOGRAPHY['font_family'],
            fontSize=TYPOGRAPHY['size_body'],
            textColor=BRAND_COLORS['text_primary'],
            spaceAfter=10,
            leading=16,
            leftIndent=0
        )

        # TOC Heading
        styles['TOCHeading'] = ParagraphStyle(
            'TOCHeading',
            parent=base_styles['Normal'],
            fontName=TYPOGRAPHY['font_family_bold'],
            fontSize=TYPOGRAPHY['size_body'],
            textColor=BRAND_COLORS['primary'],
            spaceAfter=10,
            leading=16,
            leftIndent=0
        )

        # Instrument Name
        styles['InstrumentName'] = ParagraphStyle(
            'InstrumentName',
            parent=base_styles['Normal'],
            fontName=TYPOGRAPHY['font_family_bold'],
            fontSize=14,
            textColor=BRAND_COLORS['primary'],
            spaceAfter=10,
            spaceBefore=15,
            leading=16
        )

        return styles

    def _create_cover_page(self, validation_data: Dict) -> List:
        """Crear portada profesional"""
        story = []

        # Logo horizontal (top)
        if os.path.exists(LOGO_HORIZONTAL_PATH):
            img = Image(LOGO_HORIZONTAL_PATH, width=4*inch, height=0.8*inch)
            img.hAlign = 'CENTER'
            story.append(img)
            story.append(Spacer(1, 30))

        # Title
        story.append(Paragraph(
            "Reporte de Validación de Instrumentos",
            self.styles['Title']
        ))
        story.append(Spacer(1, 10))

        # Subtitle
        story.append(Paragraph(
            "Sistema de Validación de Bases de Datos de Ensamblaje",
            self.styles['Subtitle']
        ))
        story.append(Spacer(1, 40))

        # Status badge (grande y visual)
        summary = validation_data.get('summary', {})
        status = summary.get('validation_status', 'unknown').upper()

        status_colors = {
            'SUCCESS': BRAND_COLORS['success'],
            'WARNING': BRAND_COLORS['warning'],
            'ERROR': BRAND_COLORS['error']
        }
        status_labels = {
            'SUCCESS': 'VALIDACIÓN EXITOSA',
            'WARNING': 'VALIDACIÓN CON ADVERTENCIAS',
            'ERROR': 'VALIDACIÓN CON ERRORES'
        }

        status_color = status_colors.get(status, BRAND_COLORS['text_secondary'])
        status_label = status_labels.get(status, status)

        # Status box
        status_table = Table(
            [[Paragraph(f"<b>{status_label}</b>", self.styles['Body'])]],
            colWidths=[4*inch]
        )
        status_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), status_color),
            ('TEXTCOLOR', (0, 0), (-1, -1), BRAND_COLORS['surface']),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTSIZE', (0, 0), (-1, -1), 16),
            ('FONTNAME', (0, 0), (-1, -1), TYPOGRAPHY['font_family_bold']),
            ('TOPPADDING', (0, 0), (-1, -1), 15),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 15),
        ]))
        story.append(status_table)
        story.append(Spacer(1, 40))

        # Key metrics
        total_items = summary.get('total_items', 0)
        total_instruments = summary.get('total_instruments', 0)

        metrics_data = [
            [Paragraph("<b>Métrica</b>", self.styles['Body']),
             Paragraph("<b>Valor</b>", self.styles['Body'])],
            [Paragraph("Total de Ítems Analizados", self.styles['Body']),
             Paragraph(f"<b>{total_items:,}</b>", self.styles['Body'])],
            [Paragraph("Total de Instrumentos", self.styles['Body']),
             Paragraph(f"<b>{total_instruments}</b>", self.styles['Body'])],
            [Paragraph("Fecha de Análisis", self.styles['Body']),
             Paragraph(f"<b>{datetime.now().strftime('%d/%m/%Y %H:%M')}</b>", self.styles['Body'])],
        ]

        metrics_table = Table(metrics_data, colWidths=[3*inch, 2*inch])
        metrics_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), BRAND_COLORS['table_header']),
            ('TEXTCOLOR', (0, 0), (-1, 0), BRAND_COLORS['surface']),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 1), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), TYPOGRAPHY['font_family_bold']),
            ('FONTSIZE', (0, 0), (-1, 0), TYPOGRAPHY['size_body']),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('TOPPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), BRAND_COLORS['table_row_even']),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [BRAND_COLORS['table_row_odd'], BRAND_COLORS['table_row_even']]),
            ('GRID', (0, 0), (-1, -1), 0.5, BRAND_COLORS['divider']),
        ]))
        story.append(metrics_table)
        story.append(Spacer(1, 60))

        # Footer with logo
        if os.path.exists(LOGO_CIRCLE_PATH):
            img_footer = Image(LOGO_CIRCLE_PATH, width=1.2*inch, height=1.2*inch)
            img_footer.hAlign = 'CENTER'
            story.append(img_footer)
            story.append(Spacer(1, 10))

        story.append(Paragraph(
            f"<b>{BRAND_NAME}</b><br/>{BRAND_SUBTITLE}",
            self.styles['Subtitle']
        ))

        return story

    def _create_table_of_contents(self) -> List:
        """Crear tabla de contenidos profesional con bookmarks"""
        story = []

        story.append(Paragraph("Tabla de Contenidos", self.styles['Heading1']))
        story.append(Spacer(1, 20))

        # Nota explicativa sobre navegación
        story.append(Paragraph(
            "<i>Para navegar por el documento, abra el panel de marcadores en su lector de PDF.</i>",
            self.styles['Body']
        ))
        story.append(Spacer(1, 15))

        toc_items = [
            "1. Resumen Ejecutivo",
            "2. Categorización de Variables",
            "3. Validación de Instrumentos",
            "4. Validación de Duplicados",
            "5. Validación de Metadata",
            "6. Análisis de Variables de Clasificación",
            "7. Análisis Detallado por Instrumento",
            "8. Conclusiones y Recomendaciones",
        ]

        for title in toc_items:
            story.append(Paragraph(f"• {title}", self.styles['TOC']))

        return story

    def _create_executive_summary(self, validation_data: Dict, categorization: Dict) -> List:
        """Crear resumen ejecutivo con métricas clave"""
        story = []

        # Bookmark para navegación
        self._add_bookmark(story, "1. Resumen Ejecutivo", 0)
        story.append(Paragraph('1. Resumen Ejecutivo', self.styles['Heading1']))
        story.append(Spacer(1, 15))

        summary = validation_data.get('summary', {})

        # Problem count
        dup_validation = validation_data.get('duplicate_validation', {})
        meta_validation = validation_data.get('metadata_validation', {})

        # Count problems from new structure
        total_duplicates = 0
        total_missing = 0

        # Extract from statistics
        if 'statistics' in dup_validation:
            total_duplicates = dup_validation['statistics'].get('total_duplicated_items', 0)

        if 'statistics' in meta_validation:
            total_missing = meta_validation['statistics'].get('total_missing_values', 0)

        total_problems = total_duplicates + total_missing

        # Summary paragraph
        status_text = {
            'success': "La validación se completó exitosamente sin errores críticos.",
            'warning': "La validación se completó con algunas advertencias que requieren atención.",
            'error': "La validación detectó errores críticos que deben ser corregidos."
        }

        status = summary.get('validation_status', 'unknown')
        story.append(Paragraph(
            status_text.get(status, "Estado de validación desconocido."),
            self.styles['BodyJustified']
        ))
        story.append(Spacer(1, 15))

        # Problems summary table
        problems_data = [
            [Paragraph("<b>Tipo de Problema</b>", self.styles['Body']),
             Paragraph("<b>Cantidad</b>", self.styles['Body'])],
            [Paragraph("Valores Duplicados", self.styles['Body']),
             Paragraph(f"{total_duplicates:,}", self.styles['Body'])],
            [Paragraph("Valores Faltantes", self.styles['Body']),
             Paragraph(f"{total_missing:,}", self.styles['Body'])],
            [Paragraph("<b>TOTAL DE PROBLEMAS</b>", self.styles['Body']),
             Paragraph(f"<b>{total_problems:,}</b>", self.styles['Body'])],
        ]

        problems_table = Table(problems_data, colWidths=[3.5*inch, 1.5*inch])
        problems_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), BRAND_COLORS['table_header']),
            ('TEXTCOLOR', (0, 0), (-1, 0), BRAND_COLORS['surface']),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), TYPOGRAPHY['font_family_bold']),
            ('FONTNAME', (0, -1), (-1, -1), TYPOGRAPHY['font_family_bold']),
            ('BACKGROUND', (0, -1), (-1, -1), BRAND_COLORS['warning'] if total_problems > 0 else BRAND_COLORS['success']),
            ('TEXTCOLOR', (0, -1), (-1, -1), BRAND_COLORS['surface']),
            ('ROWBACKGROUNDS', (0, 1), (-1, -2), [BRAND_COLORS['table_row_odd'], BRAND_COLORS['table_row_even']]),
            ('GRID', (0, 0), (-1, -1), 0.5, BRAND_COLORS['divider']),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(problems_table)
        story.append(Spacer(1, 20))

        # Variables categorization summary
        story.append(Paragraph("Variables Categorizadas", self.styles['Heading2']))
        story.append(Spacer(1, 10))

        categories = [
            ('instrument_vars', 'Identificación de Instrumento', 'instrument_vars'),
            ('item_id_vars', 'Identificación de Ítems', 'item_id_vars'),
            ('metadata_vars', 'Información Crítica', 'metadata_vars'),
            ('classification_vars', 'Información Complementaria', 'classification_vars'),
        ]

        for key, label, color_key in categories:
            vars_list = categorization.get(key, [])
            if vars_list:
                color_hex = BRAND_COLORS[color_key]
                vars_text = ', '.join(vars_list) if len(vars_list) <= 5 else f"{', '.join(vars_list[:5])}, ... ({len(vars_list)} total)"

                story.append(Paragraph(
                    f"<font color='{color_hex}'><b>●</b></font> <b>{label}</b> ({len(vars_list)}): {vars_text}",
                    self.styles['Body']
                ))
                story.append(Spacer(1, 5))

        return story

    def _create_categorization_section(self, categorization: Dict) -> List:
        """Crear sección de categorización de variables"""
        story = []

        self._add_bookmark(story, "2. Categorización de Variables", 0)
        story.append(Paragraph('2. Categorización de Variables', self.styles['Heading1']))
        story.append(Spacer(1, 15))

        story.append(Paragraph(
            "Las variables de la base de datos han sido categorizadas según su función en el análisis de instrumentos:",
            self.styles['BodyJustified']
        ))
        story.append(Spacer(1, 15))

        categories = [
            ('instrument_vars', 'Identificación de Instrumento',
             'Variables que identifican y distinguen diferentes instrumentos (ej: instrumento, sector, forma)'),
            ('item_id_vars', 'Identificación de Ítems',
             'Variables que identifican únicamente cada ítem dentro de un instrumento (ej: id_item, item_id)'),
            ('metadata_vars', 'Información Crítica',
             'Variables con información técnica del ítem que DEBE estar siempre completa (ej: invertido, clave)'),
            ('classification_vars', 'Información Complementaria',
             'Variables que clasifican o describen el contenido del ítem (ej: competencia, dominio)'),
        ]

        for key, title, description in categories:
            vars_list = categorization.get(key, [])

            if not vars_list:
                continue

            color = BRAND_COLORS[key]

            # Category header with colored box
            header_table = Table(
                [[Paragraph(f"<b>{title}</b> ({len(vars_list)} variables)", self.styles['Body'])]],
                colWidths=[6*inch]
            )
            header_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), color),
                ('TEXTCOLOR', (0, 0), (-1, -1), BRAND_COLORS['surface']),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ]))
            story.append(header_table)
            story.append(Spacer(1, 5))

            # Description
            story.append(Paragraph(description, self.styles['BodyJustified']))
            story.append(Spacer(1, 8))

            # Variables list
            vars_items = [f"• {var}" for var in vars_list]
            for var_item in vars_items:
                story.append(Paragraph(var_item, self.styles['Body']))

            story.append(Spacer(1, 15))

        return story

    def _create_instrument_validation_section(self, validation_data: Dict) -> List:
        """Crear sección de validación de instrumentos"""
        story = []

        self._add_bookmark(story, "3. Validación de Instrumentos", 0)
        story.append(Paragraph('3. Validación de Instrumentos', self.styles['Heading1']))
        story.append(Spacer(1, 15))

        instrument_validation = validation_data.get('instrument_validation', {})
        is_valid = instrument_validation.get('is_valid', True)

        if is_valid:
            story.append(Paragraph(
                "<font color='green'><b>VÁLIDO:</b></font> Las variables de identificación de instrumentos están correctamente configuradas.",
                self.styles['Body']
            ))
        else:
            story.append(Paragraph(
                "<font color='red'><b>ERROR:</b></font> Se detectaron problemas en las variables de identificación de instrumentos.",
                self.styles['Body']
            ))
            story.append(Spacer(1, 10))

            # Show ALL errors
            errors = instrument_validation.get('errors', [])
            if errors:
                for error in errors:
                    error_msg = error.get('message', 'Error desconocido')
                    story.append(Paragraph(f"• {error_msg}", self.styles['Body']))

        story.append(Spacer(1, 15))
        return story

    def _create_duplicate_validation_section(self, validation_data: Dict) -> List:
        """Crear sección de validación de duplicados con nueva estructura"""
        story = []

        self._add_bookmark(story, "4. Validación de Duplicados", 0)
        story.append(Paragraph('4. Validación de Duplicados', self.styles['Heading1']))
        story.append(Spacer(1, 15))

        dup_validation = validation_data.get('duplicate_validation', {})
        is_valid = dup_validation.get('is_valid', True)
        statistics = dup_validation.get('statistics', {})

        total_duplicates = statistics.get('total_duplicated_items', 0)

        if is_valid or total_duplicates == 0:
            story.append(Paragraph(
                "<font color='green'><b>VÁLIDO:</b></font> No se encontraron ítems duplicados en los identificadores.",
                self.styles['Body']
            ))
        else:
            story.append(Paragraph(
                f"<font color='red'><b>ERROR:</b></font> Se encontraron {total_duplicates:,} valores duplicados en las variables de identificación de ítems.",
                self.styles['Body']
            ))
            story.append(Spacer(1, 15))

            # Análisis por instrumento
            instruments_analysis = statistics.get('instruments_analysis', {})

            if instruments_analysis:
                story.append(Paragraph("Análisis Detallado por Instrumento:", self.styles['Heading2']))
                story.append(Spacer(1, 10))

                for instrument_key, analysis in instruments_analysis.items():
                    # Instrument name con caja visual profesional
                    instrument_display = self._format_instrument_name(instrument_key, validation_data)

                    # Caja de encabezado del instrumento
                    inst_header = Table(
                        [[Paragraph(f"<b>Instrumento: {instrument_display}</b>", self.styles['Body'])]],
                        colWidths=[6.5*inch]
                    )
                    inst_header.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, -1), BRAND_COLORS['primary']),
                        ('TEXTCOLOR', (0, 0), (-1, -1), BRAND_COLORS['surface']),
                        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                        ('TOPPADDING', (0, 0), (-1, -1), 10),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
                        ('LEFTPADDING', (0, 0), (-1, -1), 12),
                    ]))
                    story.append(inst_header)
                    story.append(Spacer(1, 8))

                    # Variables analysis
                    vars_analysis = analysis.get('variables_analysis', {})
                    for var, var_data in vars_analysis.items():
                        duplicated_count = var_data.get('total_duplicated_items', 0)
                        if duplicated_count > 0:
                            story.append(Paragraph(
                                f"  • Variable <b>{var}</b>: {duplicated_count} ítems duplicados",
                                self.styles['Body']
                            ))

                            # Mostrar TODOS los detalles sin límite
                            repeated_details = var_data.get('repeated_details', [])
                            for detail in repeated_details:
                                value = detail.get('value', '')
                                count = detail.get('count', 0)
                                story.append(Paragraph(
                                    f"    - Valor '{value}' repetido {count} veces",
                                    self.styles['Body']
                                ))

                    story.append(Spacer(1, 10))

        return story

    def _create_metadata_validation_section(self, validation_data: Dict) -> List:
        """Crear sección de validación de metadata con nueva estructura"""
        story = []

        self._add_bookmark(story, "5. Validación de Metadata", 0)
        story.append(Paragraph('5. Validación de Metadata', self.styles['Heading1']))
        story.append(Spacer(1, 15))

        meta_validation = validation_data.get('metadata_validation', {})
        is_valid = meta_validation.get('is_valid', True)
        statistics = meta_validation.get('statistics', {})

        total_missing = statistics.get('total_missing_values', 0)
        missing_pct = statistics.get('missing_percentage_overall', 0)

        if is_valid or total_missing == 0:
            story.append(Paragraph(
                "<font color='green'><b>VÁLIDO:</b></font> Todas las variables de información crítica están completas.",
                self.styles['Body']
            ))
        else:
            story.append(Paragraph(
                f"<font color='red'><b>ERROR:</b></font> Se encontraron {total_missing:,} valores faltantes ({missing_pct:.1f}%) en variables de información crítica.",
                self.styles['Body']
            ))
            story.append(Spacer(1, 15))

            # Análisis por instrumento
            instruments_analysis = statistics.get('instruments_analysis', {})

            if instruments_analysis:
                story.append(Paragraph("Completitud por Instrumento:", self.styles['Heading2']))
                story.append(Spacer(1, 10))

                for instrument_key, analysis in instruments_analysis.items():
                    instrument_display = self._format_instrument_name(instrument_key, validation_data)

                    # Caja de encabezado del instrumento
                    inst_header = Table(
                        [[Paragraph(f"<b>Instrumento: {instrument_display}</b>", self.styles['Body'])]],
                        colWidths=[6.5*inch]
                    )
                    inst_header.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, -1), BRAND_COLORS['primary']),
                        ('TEXTCOLOR', (0, 0), (-1, -1), BRAND_COLORS['surface']),
                        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                        ('TOPPADDING', (0, 0), (-1, -1), 10),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
                        ('LEFTPADDING', (0, 0), (-1, -1), 12),
                    ]))
                    story.append(inst_header)
                    story.append(Spacer(1, 10))

                    vars_analysis = analysis.get('variables_analysis', {})

                    # Create completeness chart for this instrument - TODAS las variables
                    if len(vars_analysis) > 0:
                        chart_data = []
                        for var, var_data in vars_analysis.items():
                            total_obs = var_data.get('total_observations', 1)
                            missing = var_data.get('missing_count', 0)
                            completeness = ((total_obs - missing) / total_obs * 100) if total_obs > 0 else 0
                            chart_data.append((var, completeness))

                        if chart_data:
                            chart = self._create_completeness_chart(chart_data)
                            story.append(chart)

                    story.append(Spacer(1, 15))

        return story

    def _create_classification_section(self, validation_data: Dict) -> List:
        """Crear sección de análisis de variables de clasificación"""
        story = []

        self._add_bookmark(story, "6. Análisis de Variables de Clasificación", 0)
        story.append(Paragraph('6. Análisis de Variables de Clasificación', self.styles['Heading1']))
        story.append(Spacer(1, 15))

        class_validation = validation_data.get('classification_validation', {})
        statistics = class_validation.get('statistics', {})

        if not statistics:
            story.append(Paragraph(
                "No hay variables de clasificación definidas para analizar.",
                self.styles['Body']
            ))
            return story

        avg_completeness = statistics.get('average_completeness', 0)
        total_empty = statistics.get('total_empty_cells', 0)

        story.append(Paragraph(
            f"Las variables de clasificación tienen una completitud promedio de <b>{avg_completeness:.1f}%</b> "
            f"con <b>{total_empty:,}</b> celdas vacías total.",
            self.styles['Body']
        ))
        story.append(Spacer(1, 15))

        return story

    def _create_per_instrument_analysis(self, validation_data: Dict, categorization: Dict) -> List:
        """Crear análisis detallado por cada instrumento"""
        story = []

        self._add_bookmark(story, "7. Análisis Detallado por Instrumento", 0)
        story.append(Paragraph('7. Análisis Detallado por Instrumento', self.styles['Heading1']))
        story.append(Spacer(1, 15))

        # Extract instrument analysis from both duplicate and metadata validations
        dup_validation = validation_data.get('duplicate_validation', {})
        meta_validation = validation_data.get('metadata_validation', {})

        dup_instruments = dup_validation.get('statistics', {}).get('instruments_analysis', {})
        meta_instruments = meta_validation.get('statistics', {}).get('instruments_analysis', {})

        # Combine instruments
        all_instruments = set(list(dup_instruments.keys()) + list(meta_instruments.keys()))

        if not all_instruments:
            story.append(Paragraph(
                "No hay información de instrumentos disponible para análisis detallado.",
                self.styles['Body']
            ))
            return story

        for instrument_key in all_instruments:
            instrument_display = self._format_instrument_name(instrument_key, validation_data)

            # Caja de encabezado del instrumento
            inst_header = Table(
                [[Paragraph(f"<b>Instrumento: {instrument_display}</b>", self.styles['InstrumentName'])]],
                colWidths=[6.5*inch]
            )
            inst_header.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), BRAND_COLORS['primary']),
                ('TEXTCOLOR', (0, 0), (-1, -1), BRAND_COLORS['surface']),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('TOPPADDING', (0, 0), (-1, -1), 12),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
                ('LEFTPADDING', (0, 0), (-1, -1), 15),
            ]))
            story.append(inst_header)
            story.append(Spacer(1, 12))

            # Duplicate analysis
            if instrument_key in dup_instruments:
                dup_analysis = dup_instruments[instrument_key]
                total_obs = dup_analysis.get('total_observations', 0)
                story.append(Paragraph(f"<b>Total de observaciones:</b> {total_obs:,}", self.styles['Body']))
                story.append(Spacer(1, 5))

                vars_analysis = dup_analysis.get('variables_analysis', {})
                for var, var_data in vars_analysis.items():
                    unique = var_data.get('unique_values_count', 0)
                    duplicated = var_data.get('duplicated_values_count', 0)
                    missing = var_data.get('missing_count', 0)

                    status = "VÁLIDO" if duplicated == 0 and missing == 0 else "ERROR"
                    color = "green" if duplicated == 0 and missing == 0 else "red"

                    story.append(Paragraph(
                        f"<font color='{color}'><b>{status}</b></font> <b>{var}</b>: "
                        f"{unique} únicos, {duplicated} duplicados, {missing} faltantes",
                        self.styles['Body']
                    ))

            story.append(Spacer(1, 10))

            # Metadata analysis
            if instrument_key in meta_instruments:
                meta_analysis = meta_instruments[instrument_key]
                vars_analysis = meta_analysis.get('variables_analysis', {})

                if vars_analysis:
                    story.append(Paragraph("<b>Completitud de Variables Críticas:</b>", self.styles['Body']))
                    story.append(Spacer(1, 5))

                    for var, var_data in vars_analysis.items():
                        total_obs = var_data.get('total_observations', 1)
                        missing = var_data.get('missing_count', 0)
                        completeness = ((total_obs - missing) / total_obs * 100) if total_obs > 0 else 0

                        status = "VÁLIDO" if missing == 0 else "ERROR"
                        color = "green" if missing == 0 else "red"

                        story.append(Paragraph(
                            f"<font color='{color}'><b>{status}</b></font> <b>{var}</b>: "
                            f"{completeness:.1f}% completo ({missing} faltantes)",
                            self.styles['Body']
                        ))

            story.append(Spacer(1, 20))
            # Línea separadora horizontal usando tabla
            divider = Table([['']], colWidths=[6.5*inch])
            divider.setStyle(TableStyle([
                ('LINEABOVE', (0, 0), (-1, 0), 1, BRAND_COLORS['divider']),
            ]))
            story.append(divider)
            story.append(Spacer(1, 15))

        return story

    def _create_conclusions_section(self, validation_data: Dict) -> List:
        """Crear sección de conclusiones y recomendaciones"""
        story = []

        self._add_bookmark(story, "8. Conclusiones y Recomendaciones", 0)
        story.append(Paragraph('8. Conclusiones y Recomendaciones', self.styles['Heading1']))
        story.append(Spacer(1, 15))

        summary = validation_data.get('summary', {})
        status = summary.get('validation_status', 'unknown')

        # Conclusión general
        if status == 'success':
            story.append(Paragraph(
                "<b>Conclusión General:</b> La base de datos ha superado todas las validaciones y está lista para ser utilizada en análisis.",
                self.styles['BodyJustified']
            ))
        elif status == 'warning':
            story.append(Paragraph(
                "<b>Conclusión General:</b> La base de datos presenta algunas advertencias que deben ser revisadas antes de continuar con el análisis.",
                self.styles['BodyJustified']
            ))
        else:
            story.append(Paragraph(
                "<b>Conclusión General:</b> La base de datos presenta errores críticos que deben ser corregidos antes de poder utilizarla en análisis.",
                self.styles['BodyJustified']
            ))

        story.append(Spacer(1, 15))

        # Recomendaciones
        story.append(Paragraph("<b>Recomendaciones:</b>", self.styles['Heading2']))
        story.append(Spacer(1, 10))

        recommendations = []

        # Check for duplicates
        dup_validation = validation_data.get('duplicate_validation', {})
        if not dup_validation.get('is_valid', True):
            recommendations.append(
                "Revisar y corregir los valores duplicados en las variables de identificación de ítems. "
                "Cada ítem debe tener un identificador único dentro de cada instrumento."
            )

        # Check for missing metadata
        meta_validation = validation_data.get('metadata_validation', {})
        if not meta_validation.get('is_valid', True):
            recommendations.append(
                "Completar los valores faltantes en las variables de información crítica. "
                "Esta información es esencial para el correcto procesamiento de los datos."
            )

        # General recommendations
        recommendations.append(
            "Descargar el Excel de validación para revisar visualmente las celdas con problemas "
            "(identificadas con colores según su categoría)."
        )
        recommendations.append(
            "Utilizar las columnas val_* en el Excel de validación para identificar rápidamente "
            "qué filas tienen problemas y de qué tipo."
        )
        recommendations.append(
            "Una vez corregidos los errores, volver a ejecutar la validación para confirmar que "
            "todos los problemas han sido resueltos."
        )

        for i, rec in enumerate(recommendations, 1):
            story.append(Paragraph(f"{i}. {rec}", self.styles['BodyJustified']))
            story.append(Spacer(1, 10))

        story.append(Spacer(1, 20))

        # Footer con línea separadora
        divider = Table([['']], colWidths=[6.5*inch])
        divider.setStyle(TableStyle([
            ('LINEABOVE', (0, 0), (-1, 0), 1.5, BRAND_COLORS['divider']),
        ]))
        story.append(divider)
        story.append(Spacer(1, 10))
        story.append(Paragraph(
            f"<b>Reporte generado el:</b> {datetime.now().strftime('%d/%m/%Y a las %H:%M')}<br/>"
            f"<b>Sistema:</b> Validador de Bases de Datos de Ensamblaje<br/>"
            f"<b>Institución:</b> {BRAND_NAME}",
            self.styles['Body']
        ))

        return story

    def _create_completeness_chart(self, data: List[Tuple[str, float]]) -> Drawing:
        """Crear gráfico de barras horizontal para completitud"""
        # Tamaño más grande y legible
        bar_height = 25
        label_width = 150
        chart_width = 350
        total_height = max(100, 40 + len(data) * bar_height)

        drawing = Drawing(label_width + chart_width + 20, total_height)

        chart = HorizontalBarChart()
        chart.x = label_width
        chart.y = 20
        chart.width = chart_width
        chart.height = len(data) * bar_height

        # Data
        chart.data = [[val for _, val in data]]
        chart.categoryAxis.categoryNames = [var for var, _ in data]

        # Styling mejorado
        chart.bars[0].fillColor = BRAND_COLORS['success']
        chart.valueAxis.valueMin = 0
        chart.valueAxis.valueMax = 100
        chart.valueAxis.valueStep = 25
        chart.categoryAxis.labels.fontSize = 10
        chart.valueAxis.labels.fontSize = 10
        chart.categoryAxis.labels.dx = -5
        chart.barWidth = 18

        drawing.add(chart)
        return drawing

    def _format_instrument_name(self, instrument_key: str, validation_data: Dict) -> str:
        """
        Formatear nombre de instrumento usando el display_name inteligente
        del sistema de heurísticos en lugar del formato técnico key=value
        """
        if instrument_key == 'default_instrument':
            return "Toda la base de datos"

        # Buscar el display_name en instrument_validation.instruments_detail
        instrument_validation = validation_data.get('instrument_validation', {})
        instruments_detail = instrument_validation.get('instruments_detail', {})

        if instrument_key in instruments_detail:
            display_name = instruments_detail[instrument_key].get('display_name', '')
            if display_name:
                return display_name

        # Fallback al formato técnico si no se encuentra el display_name
        parts = instrument_key.split('|')
        formatted_parts = []
        for part in parts:
            if ':' in part:
                key, value = part.split(':', 1)
                formatted_parts.append(f"{key}: {value}")

        return ", ".join(formatted_parts) if formatted_parts else instrument_key

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
