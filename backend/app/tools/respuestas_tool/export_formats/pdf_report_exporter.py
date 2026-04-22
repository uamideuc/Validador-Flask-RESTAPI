"""
Exportador PDF para el validador de respuestas
Reutiliza la infraestructura visual del exportador de ensamblaje.
"""
import os
import json
import tempfile
from io import BytesIO
from datetime import datetime
from typing import Dict, Any, List

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
)

from ....core.assets.brand import BRAND_COLORS, BRAND_NAME, BRAND_SUBTITLE
from ...ensamblaje_tool.export_formats.pdf_report_exporter import (
    PDFReportExporter as BasePDFReportExporter,
    SimpleNumberedCanvas
)


class RespuestasPDFReportExporter(BasePDFReportExporter):
    """Exportador de reporte PDF para respuestas con el mismo branding institucional."""

    def export(self, validation_session_id: int) -> Dict[str, Any]:
        try:
            validation_session = self.db.get_validation_session(validation_session_id)
            if not validation_session:
                return {
                    'success': False,
                    'error': 'Sesión de validación no encontrada'
                }

            validation_results = validation_session['validation_results']
            if isinstance(validation_results, str):
                validation_results = json.loads(validation_results)

            categorization = validation_session['categorization']
            if isinstance(categorization, str):
                categorization = json.loads(categorization)

            file_metadata = {
                'original_filename': validation_session.get('filename', 'Archivo no especificado'),
                'sheet_name': validation_session.get('sheet_name'),
                'analysis_date': datetime.now()
            }

            filename = f"reporte_validacion_respuestas_{validation_session_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            file_path = os.path.join(tempfile.gettempdir(), filename)

            buffer = self._generate_pdf_buffer(validation_results, categorization, file_metadata)
            with open(file_path, 'wb') as handle:
                handle.write(buffer.getvalue())

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
        except Exception as exc:
            import traceback
            return {
                'success': False,
                'error': f'Error en exportación PDF de respuestas: {str(exc)}',
                'traceback': traceback.format_exc()
            }

    def _generate_pdf_buffer(self, validation_data: Dict[str, Any], categorization: Dict[str, Any], file_metadata: Dict[str, Any]) -> BytesIO:
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=40,
            leftMargin=40,
            topMargin=60,
            bottomMargin=60
        )

        story: List[Any] = []
        story.extend(self._create_cover_page(validation_data, file_metadata))
        story.append(PageBreak())
        story.extend(self._create_table_of_contents())
        story.append(PageBreak())
        story.extend(self._create_executive_summary(validation_data))
        story.append(PageBreak())
        story.extend(self._create_categorization_section(categorization))
        story.append(PageBreak())
        story.extend(self._create_duplicates_section(validation_data))
        story.append(PageBreak())
        story.extend(self._create_response_range_section(validation_data))
        story.append(PageBreak())
        story.extend(self._create_missing_patterns_section(validation_data))
        story.append(PageBreak())
        story.extend(self._create_variability_section(validation_data))
        story.append(PageBreak())
        story.extend(self._create_structure_checks_section(validation_data))
        story.append(PageBreak())
        story.extend(self._create_conclusions_section(validation_data))

        doc.build(story, canvasmaker=SimpleNumberedCanvas)
        buffer.seek(0)
        return buffer

    def _create_cover_page(self, validation_data: Dict[str, Any], file_metadata: Dict[str, Any]) -> List[Any]:
        story: List[Any] = []
        summary = validation_data.get('summary', {})
        status = summary.get('validation_status', 'error')
        status_map = {
            'success': ('VALIDACIÓN EXITOSA', BRAND_COLORS['success']),
            'warning': ('VALIDACIÓN CON ADVERTENCIAS', BRAND_COLORS['warning']),
            'error': ('VALIDACIÓN CON ERRORES', BRAND_COLORS['error'])
        }
        status_label, status_color = status_map.get(status, status_map['error'])

        story.append(Spacer(1, 1.2 * inch))
        story.append(Paragraph("Reporte de Validación de Respuestas", self.styles['Title']))
        story.append(Spacer(1, 12))
        story.append(Paragraph("Sistema de Validación de Bases de Datos de Respuestas", self.styles['Subtitle']))
        story.append(Spacer(1, 30))

        status_table = Table([[Paragraph(f"<b>{status_label}</b>", self.styles['Body'])]], colWidths=[4.5 * inch])
        status_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), status_color),
            ('TEXTCOLOR', (0, 0), (-1, -1), BRAND_COLORS['surface']),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('TOPPADDING', (0, 0), (-1, -1), 14),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 14),
        ]))
        story.append(status_table)
        story.append(Spacer(1, 32))

        story.append(Paragraph(f"<b>Archivo:</b> {file_metadata.get('original_filename', 'Archivo no especificado')}", self.styles['Body']))
        if file_metadata.get('sheet_name'):
            story.append(Paragraph(f"<b>Hoja:</b> {file_metadata['sheet_name']}", self.styles['Body']))
        story.append(Paragraph(
            f"<b>Fecha de análisis:</b> {file_metadata.get('analysis_date', datetime.now()).strftime('%d/%m/%Y a las %H:%M')}",
            self.styles['Body']
        ))
        story.append(Spacer(1, 48))
        story.append(Paragraph(f"<b>{BRAND_NAME}</b><br/>{BRAND_SUBTITLE}", self.styles['Subtitle']))
        return story

    def _create_table_of_contents(self) -> List[Any]:
        story: List[Any] = []
        story.append(Paragraph("Tabla de Contenidos", self.styles['Heading1']))
        story.append(Spacer(1, 20))
        items = [
            "1. Resumen Ejecutivo",
            "2. Categorización de Variables",
            "3. Duplicados de ID",
            "4. Rango de Respuestas",
            "5. Patrones de Missing",
            "6. Variabilidad",
            "7. Estructura de Variables",
            "8. Conclusiones y Recomendaciones",
        ]
        for item in items:
            story.append(Paragraph(f"• {item}", self.styles['TOC']))
        return story

    def _create_executive_summary(self, validation_data: Dict[str, Any]) -> List[Any]:
        story: List[Any] = []
        self._add_bookmark(story, "1. Resumen Ejecutivo", 0)
        summary = validation_data.get('summary', {})
        duplicate_validation = validation_data.get('duplicate_validation', {})
        range_validation = validation_data.get('response_range_validation', {})
        missing_validation = validation_data.get('missing_patterns_validation', {})

        story.append(Paragraph("1. Resumen Ejecutivo", self.styles['Heading1']))
        story.append(Paragraph(
            f"Se analizaron <b>{summary.get('total_items', 0):,} participantes</b> con estado general "
            f"<b>{summary.get('validation_status', 'desconocido').upper()}</b>.",
            self.styles['Body']
        ))
        story.append(Spacer(1, 12))

        metrics = [
            ['Métrica', 'Valor'],
            ['Grupos con ID duplicado', str(duplicate_validation.get('statistics', {}).get('simple_dup_groups', 0))],
            ['Grupos clonados', str(duplicate_validation.get('statistics', {}).get('clone_groups', 0))],
            ['Ítems con valores fuera de rango', str(range_validation.get('statistics', {}).get('items_with_issues', 0))],
            ['Participantes con missing excesivo', str(missing_validation.get('statistics', {}).get('participants_with_excessive_missing', 0))]
        ]
        story.append(self._build_table(metrics, [3.7 * inch, 2.8 * inch]))
        return story

    def _create_categorization_section(self, categorization: Dict[str, Any]) -> List[Any]:
        story: List[Any] = []
        self._add_bookmark(story, "2. Categorización de Variables", 0)
        story.append(Paragraph("2. Categorización de Variables", self.styles['Heading1']))

        rows = [
            ['Categoría', 'Variables'],
            ['ID participante', ', '.join(categorization.get('participant_id_vars', [])) or 'No definidas'],
            ['Otras relevantes', ', '.join(categorization.get('other_relevant_vars', [])) or 'No definidas'],
            ['Respuestas / ítems', ', '.join(categorization.get('response_vars', [])) or 'No definidas'],
            ['Metadata', ', '.join(categorization.get('metadata_vars', [])) or 'No definidas'],
        ]
        story.append(self._build_table(rows, [2.2 * inch, 4.3 * inch]))
        return story

    def _create_duplicates_section(self, validation_data: Dict[str, Any]) -> List[Any]:
        story: List[Any] = []
        self._add_bookmark(story, "3. Duplicados de ID", 0)
        result = validation_data.get('duplicate_validation', {})
        story.append(Paragraph("3. Duplicados de ID", self.styles['Heading1']))

        errors = result.get('errors', [])
        warnings = result.get('warnings', [])
        if errors:
            for error in errors:
                story.append(self._create_info_box("Error", error['message'], BRAND_COLORS['error']))
                story.append(Spacer(1, 8))
        if warnings:
            for warning in warnings:
                story.append(self._create_info_box("Advertencia", warning['message'], BRAND_COLORS['warning']))
                story.append(Spacer(1, 8))
        if not errors and not warnings:
            story.append(self._create_info_box("Resultado", "No se detectaron problemas en identificadores de participante.", BRAND_COLORS['success']))
            return story

        simple_duplicates = result.get('simple_duplicates', [])
        if simple_duplicates:
            rows = [['ID', 'Repeticiones', 'Filas']]
            for dup in simple_duplicates[:20]:
                rows.append([
                    ' | '.join(str(value) for value in dup.get('id_values', {}).values()),
                    str(dup.get('count', 0)),
                    ', '.join(str(idx) for idx in dup.get('row_indices', []))
                ])
            story.append(Spacer(1, 10))
            story.append(Paragraph("Duplicados con valores distintos", self.styles['Heading2']))
            story.append(self._build_table(rows, [2.5 * inch, 1.1 * inch, 2.9 * inch]))

        clone_duplicates = result.get('clone_duplicates', [])
        if clone_duplicates:
            rows = [['ID', 'Copias']]
            for dup in clone_duplicates[:20]:
                rows.append([
                    ' | '.join(str(value) for value in dup.get('id_values', {}).values()),
                    str(dup.get('count', 0))
                ])
            story.append(Spacer(1, 10))
            story.append(Paragraph("Filas completamente idénticas", self.styles['Heading2']))
            story.append(self._build_table(rows, [5.3 * inch, 1.2 * inch]))

        return story

    def _create_response_range_section(self, validation_data: Dict[str, Any]) -> List[Any]:
        story: List[Any] = []
        self._add_bookmark(story, "4. Rango de Respuestas", 0)
        result = validation_data.get('response_range_validation', {})
        story.append(Paragraph("4. Rango de Respuestas", self.styles['Heading1']))

        if result.get('errors'):
            for error in result['errors']:
                story.append(self._create_info_box("Error", error['message'], BRAND_COLORS['error']))
                story.append(Spacer(1, 8))
        else:
            story.append(self._create_info_box("Resultado", "No se detectaron valores fuera de rango.", BRAND_COLORS['success']))

        by_item = result.get('out_of_range_by_item', {})
        if by_item:
            rows = [['Ítem', 'Fuera de rango', '%', 'Valores inválidos']]
            for item, data in list(by_item.items())[:25]:
                invalid_values = ', '.join(f"{key} ({value})" for key, value in list(data.get('invalid_values', {}).items())[:4])
                rows.append([
                    item,
                    str(data.get('count', 0)),
                    f"{data.get('percentage', 0)}%",
                    invalid_values or 'N/A'
                ])
            story.append(Spacer(1, 10))
            story.append(self._build_table(rows, [1.7 * inch, 1.0 * inch, 0.8 * inch, 3.0 * inch]))

        return story

    def _create_missing_patterns_section(self, validation_data: Dict[str, Any]) -> List[Any]:
        story: List[Any] = []
        self._add_bookmark(story, "5. Patrones de Missing", 0)
        result = validation_data.get('missing_patterns_validation', {})
        story.append(Paragraph("5. Patrones de Missing", self.styles['Heading1']))

        for warning in result.get('warnings', []):
            story.append(self._create_info_box("Advertencia", warning['message'], BRAND_COLORS['warning']))
            story.append(Spacer(1, 8))

        stats = result.get('statistics', {})
        story.append(Paragraph(
            f"Missing total observado: <b>{stats.get('overall_missing_percentage', 0)}%</b>. "
            f"Ítems con missing: <b>{stats.get('items_with_any_missing', 0)}</b>.",
            self.styles['Body']
        ))
        story.append(Spacer(1, 8))

        details = result.get('missing_by_participant', {}).get('details', [])
        if details:
            rows = [['Fila', 'ID', 'Missing', '%']]
            for participant in details[:20]:
                rows.append([
                    str(participant.get('row_index', '')),
                    ' | '.join(str(value) for value in participant.get('participant_id', {}).values()),
                    f"{participant.get('missing_count', 0)}/{participant.get('total_items', 0)}",
                    f"{participant.get('percentage', 0)}%"
                ])
            story.append(self._build_table(rows, [0.8 * inch, 3.0 * inch, 1.0 * inch, 1.2 * inch]))

        return story

    def _create_variability_section(self, validation_data: Dict[str, Any]) -> List[Any]:
        story: List[Any] = []
        self._add_bookmark(story, "6. Variabilidad", 0)
        result = validation_data.get('variability_validation', {})
        story.append(Paragraph("6. Variabilidad", self.styles['Heading1']))

        warnings = result.get('warnings', [])
        if warnings:
            for warning in warnings:
                story.append(self._create_info_box("Advertencia", warning['message'], BRAND_COLORS['warning']))
                story.append(Spacer(1, 8))
        else:
            story.append(self._create_info_box("Resultado", "No se detectaron columnas constantes ni quasi-constantes.", BRAND_COLORS['success']))

        constant_columns = result.get('constant_columns', [])
        quasi_constant_columns = result.get('quasi_constant_columns', [])
        if constant_columns or quasi_constant_columns:
            rows = [['Columna', 'Tipo', 'Detalle']]
            for column in constant_columns:
                rows.append([
                    column.get('column', ''),
                    'Constante',
                    f"Valor único: {column.get('value', '')} ({column.get('count', 0)} filas)"
                ])
            for column in quasi_constant_columns:
                rows.append([
                    column.get('column', ''),
                    'Quasi-constante',
                    f"Dominante: {column.get('dominant_value', '')} ({column.get('dominant_percentage', 0)}%)"
                ])
            story.append(self._build_table(rows, [1.8 * inch, 1.5 * inch, 3.2 * inch]))

        return story

    def _create_structure_checks_section(self, validation_data: Dict[str, Any]) -> List[Any]:
        story: List[Any] = []
        self._add_bookmark(story, "7. Estructura de Variables", 0)
        story.append(Paragraph("7. Estructura de Variables", self.styles['Heading1']))

        duplicate_names = validation_data.get('duplicate_names_validation', {})
        identical_columns = validation_data.get('identical_columns_validation', {})

        duplicate_groups = duplicate_names.get('duplicate_groups', [])
        if duplicate_groups:
            story.append(Paragraph("Nombres de variables repetidos", self.styles['Heading2']))
            rows = [['Nombre', 'Veces', 'Columnas']]
            for group in duplicate_groups[:20]:
                rows.append([
                    group.get('name', ''),
                    str(group.get('count', 0)),
                    ', '.join(str(idx) for idx in group.get('column_indices', []))
                ])
            story.append(self._build_table(rows, [2.6 * inch, 0.9 * inch, 2.8 * inch]))
            story.append(Spacer(1, 10))

        identical_pairs = identical_columns.get('identical_pairs', [])
        if identical_pairs:
            story.append(Paragraph("Columnas idénticas", self.styles['Heading2']))
            rows = [['Columnas', 'Cantidad']]
            for pair in identical_pairs[:20]:
                rows.append([
                    ', '.join(pair.get('columns', [])),
                    str(pair.get('count', 0))
                ])
            story.append(self._build_table(rows, [5.3 * inch, 1.2 * inch]))

        if not duplicate_groups and not identical_pairs:
            story.append(self._create_info_box("Resultado", "No se detectaron problemas estructurales en nombres o columnas idénticas.", BRAND_COLORS['success']))

        return story

    def _create_conclusions_section(self, validation_data: Dict[str, Any]) -> List[Any]:
        story: List[Any] = []
        self._add_bookmark(story, "8. Conclusiones y Recomendaciones", 0)
        story.append(Paragraph("8. Conclusiones y Recomendaciones", self.styles['Heading1']))

        status = validation_data.get('summary', {}).get('validation_status', 'error')
        if status == 'success':
            conclusion = "La base de respuestas superó las validaciones implementadas y está en condiciones de uso."
        elif status == 'warning':
            conclusion = "La base presenta advertencias relevantes. Conviene revisarlas antes de continuar con análisis posteriores."
        else:
            conclusion = "La base presenta errores que deben corregirse antes de ser utilizada en análisis."

        story.append(Paragraph(f"<b>Conclusión general:</b> {conclusion}", self.styles['BodyJustified']))
        story.append(Spacer(1, 12))

        recommendations = [
            "Revise primero los duplicados de participante, porque suelen contaminar el resto de los indicadores.",
            "Corrija valores fuera de rango y valide que cada ítem tenga su configuración de valores válidos y missing.",
            "Use este PDF como registro del proceso y el validador web para iterar con nuevas corridas de validación."
        ]

        for index, recommendation in enumerate(recommendations, start=1):
            story.append(Paragraph(f"{index}. {recommendation}", self.styles['BodyJustified']))
            story.append(Spacer(1, 8))

        story.append(Spacer(1, 16))
        story.append(Paragraph(
            f"<b>Reporte generado el:</b> {datetime.now().strftime('%d/%m/%Y a las %H:%M')}<br/>"
            f"<b>Sistema:</b> Validador de Bases de Datos de Respuestas<br/>"
            f"<b>Institución:</b> {BRAND_NAME}",
            self.styles['Body']
        ))
        return story

    def _build_table(self, rows: List[List[str]], col_widths: List[float]) -> Table:
        table = Table(rows, colWidths=col_widths)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), BRAND_COLORS['primary']),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('GRID', (0, 0), (-1, -1), 0.5, BRAND_COLORS['divider']),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F7F9FC')]),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        return table
