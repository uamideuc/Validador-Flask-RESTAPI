"""
Exportador xlsx de validación para RespuestasToolKit.
Homólogo al ValidationExcelExporter de ensamblaje, adaptado a los 6 checks de respuestas.

Hoja 1 (Datos_Validacion): base original + columnas val_* con códigos + val_FILA.
Hojas 2-9: resumen, item configs y detalle sin truncar por check.
"""
import pandas as pd
import os
import tempfile
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
from openpyxl import load_workbook
from openpyxl.styles import PatternFill, Font
from openpyxl.utils import get_column_letter
from ....core.models import RespuestasCategorization
from ....core.services.file_handling.file_parser import FileParser
from ..constants import QUASI_CONSTANT_THRESHOLD, PARTICIPANT_EXCESSIVE_MISSING_THRESHOLD


# Colores por categoría — idénticos a los boxes de categorización del UI (VariableCategorization.tsx)
CATEGORY_COLORS = {
    'participant_id_vars': 'FF1976D2',   # Azul
    'other_relevant_vars': 'FF388E3C',   # Verde
    'response_vars':       'FFF57C00',   # Naranja
    'metadata_vars':       'FF7B1FA2',   # Púrpura
}

OK_FONT_GRAY   = 'FF808080'
ROW_PROBLEM_RED = 'FFD32F2F'

# Errores a nivel de celda → fill SÓLIDO (fondo sólido + fuente blanca)
CELL_LEVEL_FILL_CODES = frozenset(['FUERA_RANGO', 'DUPLICADO_ID', 'CLON_FILA'])

# Problemas a nivel de columna completa → fill SUAVE (pastel en datos, encabezado sólido)
COLUMN_LEVEL_FILL_CODES = frozenset(['CONSTANTE', 'QUASI_CONSTANTE', 'COL_IDENTICA'])

# Versiones pasteles para fills suaves de columnas — mismo orden que CATEGORY_COLORS
CATEGORY_COLORS_LIGHT = {
    'participant_id_vars': 'FFE3F2FD',  # Azul muy suave
    'other_relevant_vars': 'FFE8F5E9',  # Verde muy suave
    'response_vars':       'FFFFF3E0',  # Naranja muy suave
    'metadata_vars':       'FFF3E5F5',  # Púrpura muy suave
}


class RespuestasValidationExcelExporter:
    """Exportador xlsx de validación con celdas coloreadas y columnas val_* para respuestas."""

    def __init__(self, session_id: str):
        self.session_id = session_id
        self.db = self._get_db_manager()

    # ------------------------------------------------------------------ #
    #  Entry point                                                         #
    # ------------------------------------------------------------------ #

    def export(self, validation_session_id: int) -> Dict[str, Any]:
        try:
            validation_session = self.db.get_validation_session(validation_session_id)
            if not validation_session:
                return {'success': False, 'error': 'Sesión de validación no encontrada'}

            validation_results = validation_session['validation_results']
            if isinstance(validation_results, str):
                validation_results = json.loads(validation_results)

            original_file_path = validation_session['file_path']
            sheet_name = validation_session.get('sheet_name')
            parser = FileParser()
            original_data = parser.parse_file(original_file_path, sheet_name)

            categorization_dict = validation_session['categorization']
            if isinstance(categorization_dict, str):
                categorization_dict = json.loads(categorization_dict)
            categorization = RespuestasCategorization.from_dict(categorization_dict)
            response_types = categorization_dict.get('response_types', [])

            # Re-detectar problemas desde el DataFrame original (sin truncamientos de los checks)
            cell_problems = self._build_cell_problems_map(original_data, categorization, validation_results)
            row_problems  = self._build_row_problems_map(original_data, categorization, cell_problems)

            annotated_data    = self._create_annotated_data_with_val_columns(
                original_data, categorization, cell_problems, row_problems
            )
            annotated_as_text = annotated_data.astype(str)

            filename  = f"validation_excel_respuestas_{validation_session_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
            file_path = os.path.join(tempfile.gettempdir(), filename)

            with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
                annotated_as_text.to_excel(writer, sheet_name='Datos_Validacion', index=False)

                self._create_validation_summary_sheet(
                    validation_results, categorization, cell_problems, row_problems
                ).to_excel(writer, sheet_name='Resumen_Validacion', index=False)

                self._create_item_configs_sheet(
                    categorization, response_types
                ).to_excel(writer, sheet_name='Item_Configs', index=False)

                self._create_duplicates_sheet(
                    original_data, categorization
                ).to_excel(writer, sheet_name='Duplicados_ID', index=False)

                self._create_out_of_range_sheet(
                    original_data, categorization
                ).to_excel(writer, sheet_name='Fuera_Rango_Detalle', index=False)

                self._create_missing_per_participant_sheet(
                    original_data, categorization
                ).to_excel(writer, sheet_name='Missing_Por_Participante', index=False)

                self._create_variability_sheet(
                    validation_results
                ).to_excel(writer, sheet_name='Variabilidad', index=False)

                self._create_identical_columns_sheet(
                    validation_results
                ).to_excel(writer, sheet_name='Columnas_Identicas', index=False)

                self._create_duplicate_names_sheet(
                    original_data, categorization
                ).to_excel(writer, sheet_name='Nombres_Duplicados', index=False)

            self._apply_excel_formatting(file_path, annotated_as_text, categorization, cell_problems, row_problems)

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
            import traceback
            return {
                'success': False,
                'error': f'Error en exportación Excel: {str(e)}',
                'traceback': traceback.format_exc()
            }

    # ------------------------------------------------------------------ #
    #  Cell / row problem maps (re-detección sin truncar)                  #
    # ------------------------------------------------------------------ #

    def _build_cell_problems_map(
        self,
        data: pd.DataFrame,
        categorization: RespuestasCategorization,
        validation_results: Dict
    ) -> Dict[str, Dict[int, str]]:
        """
        Retorna {variable: {row_index: 'CODIGO'}} para cada celda con problema.
        Re-detecta duplicados, rango y missing directamente sobre el DataFrame.
        Consume variabilidad e idénticas desde los results (no truncan).
        """
        problems: Dict[str, Dict[int, str]] = {}

        def _add(var, idx, code):
            if var not in problems:
                problems[var] = {}
            prev = problems[var].get(idx)
            problems[var][idx] = f"{prev}+{code}" if prev else code

        # 1. Duplicados de participant_id
        id_cols = [c for c in categorization.participant_id_vars if c in data.columns]
        if id_cols:
            all_cols = list(data.columns)
            compare_cols = [c for c in all_cols if c not in id_cols]
            dup_mask = data.duplicated(subset=id_cols, keep=False)
            dup_rows = data[dup_mask]
            if len(dup_rows) > 0:
                grouped = dup_rows.groupby(id_cols, dropna=False)
                for _, group_df in grouped:
                    indices = group_df.index.tolist()
                    if compare_cols:
                        all_equal = group_df[compare_cols].apply(
                            lambda col: col.fillna('__NA__').nunique() == 1
                        ).all()
                    else:
                        all_equal = True
                    code = 'CLON_FILA' if all_equal else 'DUPLICADO_ID'
                    for var in categorization.participant_id_vars:
                        for idx in indices:
                            _add(var, idx, code)

        # 2. Fuera de rango y missing en response_vars
        for var in categorization.response_vars:
            if var not in data.columns:
                continue
            item_config = categorization.get_item_config(var)
            if not item_config:
                continue

            valid_set   = {str(v) for v in item_config.valid_values}
            missing_set = {str(v) for v in item_config.missing_values}

            for idx, value in data[var].items():
                code = self._classify_response_cell(value, valid_set, missing_set, item_config.missing_includes_empty)
                if code:
                    _add(var, idx, code)

        # 3. Variabilidad — consume results (sin truncamiento en VariabilityValidationResult)
        var_res = validation_results.get('variability_validation', {})
        all_rows = data.index.tolist()

        for entry in var_res.get('constant_columns', []):
            col = entry.get('column')
            if col and col in data.columns:
                for idx in all_rows:
                    _add(col, idx, 'CONSTANTE')

        for entry in var_res.get('quasi_constant_columns', []):
            col = entry.get('column')
            if col and col in data.columns:
                for idx in all_rows:
                    _add(col, idx, 'QUASI_CONSTANTE')

        # 4. Columnas idénticas — consume results (sin truncamiento en IdenticalColumnsValidationResult)
        id_col_res = validation_results.get('identical_columns_validation', {})
        for pair in id_col_res.get('identical_pairs', []):
            for col in pair.get('columns', []):
                if col in data.columns:
                    for idx in all_rows:
                        _add(col, idx, 'COL_IDENTICA')

        return problems

    def _classify_response_cell(
        self,
        value,
        valid_set: set,
        missing_set: set,
        missing_includes_empty: bool
    ) -> Optional[str]:
        """Clasifica una celda de respuesta. Retorna código de problema o None si OK."""
        import pandas as _pd
        is_nan = _pd.isna(value)
        str_val = '' if is_nan else str(value).strip()

        if is_nan or str_val == '':
            if missing_includes_empty:
                return 'MISSING'
            if valid_set:
                return 'FUERA_RANGO'
            return None

        if valid_set:
            if str_val in valid_set:
                return None
            if str_val in missing_set:
                return 'MISSING'
            return 'FUERA_RANGO'

        if missing_set and str_val in missing_set:
            return 'MISSING'

        return None

    def _build_row_problems_map(
        self,
        data: pd.DataFrame,
        categorization: RespuestasCategorization,
        cell_problems: Dict[str, Dict[int, str]]
    ) -> Dict[int, str]:
        """
        Retorna {row_index: 'CODIGO'} para problemas a nivel de fila completa:
        CLON_FILA y MISSING_EXCESIVO.
        """
        row_problems: Dict[int, str] = {}

        def _add_row(idx, code):
            prev = row_problems.get(idx)
            row_problems[idx] = f"{prev}+{code}" if prev else code

        # CLON_FILA: si cualquier participant_id_var tiene código CLON_FILA en esa fila
        for var in categorization.participant_id_vars:
            for idx, code in cell_problems.get(var, {}).items():
                if 'CLON_FILA' in code:
                    _add_row(idx, 'CLON_FILA')

        # MISSING_EXCESIVO: re-computar % missing por participante (sin truncar)
        response_cols = [c for c in categorization.response_vars if c in data.columns]
        if response_cols:
            for row_idx, row in data.iterrows():
                missing_in_row = 0
                for var in response_cols:
                    item_config = categorization.get_item_config(var)
                    val = row.get(var)
                    if item_config:
                        valid_set   = {str(v) for v in item_config.valid_values}
                        missing_set = {str(v) for v in item_config.missing_values}
                        code = self._classify_response_cell(val, valid_set, missing_set, item_config.missing_includes_empty)
                        if code == 'MISSING':
                            missing_in_row += 1
                    else:
                        if pd.isna(val):
                            missing_in_row += 1

                pct = (missing_in_row / len(response_cols)) * 100
                if pct >= PARTICIPANT_EXCESSIVE_MISSING_THRESHOLD:
                    _add_row(row_idx, 'MISSING_EXCESIVO')

        return row_problems

    # ------------------------------------------------------------------ #
    #  Hoja 1: datos anotados                                              #
    # ------------------------------------------------------------------ #

    def _create_annotated_data_with_val_columns(
        self,
        data: pd.DataFrame,
        categorization: RespuestasCategorization,
        cell_problems: Dict[str, Dict[int, str]],
        row_problems: Dict[int, str]
    ) -> pd.DataFrame:
        """
        Columnas: [todas las originales] + [val_<col> para id/response/other_relevant] + [val_FILA].
        No se agrega val_* para metadata_vars (no se validan).
        """
        result = data.copy()

        validated_vars = set(
            categorization.participant_id_vars +
            categorization.response_vars +
            categorization.other_relevant_vars
        )

        for col in data.columns:
            if col not in validated_vars:
                continue
            col_probs = cell_problems.get(col, {})
            result[f'val_{col}'] = [
                col_probs.get(idx, 'OK') for idx in data.index
            ]

        result['val_FILA'] = [row_problems.get(idx, 'OK') for idx in data.index]

        return result

    # ------------------------------------------------------------------ #
    #  Hoja 2: resumen                                                     #
    # ------------------------------------------------------------------ #

    def _create_validation_summary_sheet(
        self,
        validation_results: Dict,
        categorization: RespuestasCategorization,
        cell_problems: Dict[str, Dict[int, str]],
        row_problems: Dict[int, str]
    ) -> pd.DataFrame:
        rows = []
        summary = validation_results.get('summary', {})

        rows.append(['RESUMEN DE VALIDACIÓN', ''])
        rows.append(['', ''])
        rows.append(['Fecha de validación', datetime.now().strftime('%Y-%m-%d %H:%M:%S')])
        rows.append(['Total de participantes', summary.get('total_items', 0)])
        rows.append(['Total de ítems de respuesta', len(categorization.response_vars)])
        rows.append(['Estado general', summary.get('validation_status', 'desconocido').upper()])
        rows.append(['', ''])

        # Conteo de problemas — distinct count por celda (sin double-counting)
        all_problem_cells = {
            (var, idx)
            for var, probs in cell_problems.items()
            for idx in probs
        }
        fuera_rango_cells = sum(
            1 for var, probs in cell_problems.items()
            for code in probs.values()
            if 'FUERA_RANGO' in code
        )
        missing_cells = sum(
            1 for var, probs in cell_problems.items()
            for code in probs.values()
            if 'MISSING' in code and 'MISSING_EXCESIVO' not in code
        )
        dup_id_cells = sum(
            1 for var, probs in cell_problems.items()
            for code in probs.values()
            if 'DUPLICADO_ID' in code
        )
        clon_cells = sum(
            1 for var, probs in cell_problems.items()
            for code in probs.values()
            if 'CLON_FILA' in code
        )
        constante_cols = set(
            var for var, probs in cell_problems.items()
            if any('CONSTANTE' in c and 'QUASI' not in c for c in probs.values())
        )
        quasi_cols = set(
            var for var, probs in cell_problems.items()
            if any('QUASI_CONSTANTE' in c for c in probs.values())
        )
        identica_cols = set(
            var for var, probs in cell_problems.items()
            if any('COL_IDENTICA' in c for c in probs.values())
        )
        filas_con_problema = len([idx for idx, code in row_problems.items() if code != 'OK'])
        missing_excesivo_filas = sum(1 for code in row_problems.values() if 'MISSING_EXCESIVO' in code)
        clon_filas = sum(1 for code in row_problems.values() if 'CLON_FILA' in code)

        rows.append(['CONTEO DE PROBLEMAS DETECTADOS', ''])
        rows.append(['Total de celdas con problema (distinct)', len(all_problem_cells)])
        rows.append(['  - Valores fuera de rango', fuera_rango_cells])
        rows.append(['  - Valores missing declarados', missing_cells])
        rows.append(['  - Celdas en filas con ID duplicado (SIMPLE)', dup_id_cells])
        rows.append(['  - Celdas en filas clonadas', clon_cells])
        rows.append(['Total de filas con problema de fila', filas_con_problema])
        rows.append(['  - Filas clonadas (CLON_FILA)', clon_filas])
        rows.append(['  - Participantes con missing excesivo', missing_excesivo_filas])
        rows.append(['Columnas constantes', len(constante_cols)])
        rows.append(['Columnas quasi-constantes', len(quasi_cols)])
        rows.append(['Columnas idénticas a otra', len(identica_cols)])
        rows.append(['', ''])

        rows.append(['VARIABLES CATEGORIZADAS', ''])
        rows.append(['Categoría', 'Variables'])
        rows.append(['Identificación del Participante', ', '.join(categorization.participant_id_vars)])
        rows.append(['Otras Variables Relevantes', ', '.join(categorization.other_relevant_vars)])
        rows.append(['Respuestas / Ítems', ', '.join(categorization.response_vars)])
        rows.append(['Metadata / Complementarias', ', '.join(categorization.metadata_vars)])
        rows.append(['', ''])

        rows.append(['ESTADO DE VALIDACIONES', ''])
        checks = [
            ('Duplicados de ID',        'duplicate_validation'),
            ('Rango de Respuestas',      'response_range_validation'),
            ('Patrones de Missing',      'missing_patterns_validation'),
            ('Variabilidad',             'variability_validation'),
            ('Columnas Idénticas',       'identical_columns_validation'),
        ]
        for label, key in checks:
            is_valid = validation_results.get(key, {}).get('is_valid', True)
            rows.append([label, 'VÁLIDO ✓' if is_valid else 'ERRORES ✗'])
        rows.append(['', ''])

        rows.append(['INSTRUCCIONES', ''])
        rows.append(['1. Hoja "Datos_Validacion": base original con columnas val_* al final', ''])
        rows.append(['2. Columnas val_<nombre>: estado de cada celda (OK o código de error)', ''])
        rows.append(['3. Columna val_FILA: problema a nivel de fila completa', ''])
        rows.append(['4. Celdas de datos coloreadas según su categoría cuando hay problema', ''])
        rows.append(['CÓDIGOS — ERRORES DE CELDA (fondo sólido en datos)', ''])
        rows.append(['OK', 'Sin problema — gris en val_*, sin color en datos'])
        rows.append(['DUPLICADO_ID', 'ID de participante repetido con valores distintos → fondo sólido + val_* en color'])
        rows.append(['CLON_FILA', 'Fila completamente idéntica a otra → fondo sólido + val_FILA con código'])
        rows.append(['FUERA_RANGO', 'Valor fuera de los rangos válidos/missing declarados → fondo sólido + val_* en color'])
        rows.append(['', ''])
        rows.append(['CÓDIGOS — MISSING DECLARADO (sin color en datos)', ''])
        rows.append(['MISSING', 'Valor declarado como missing en la config del ítem — no es error; aparece en gris en val_*'])
        rows.append(['', ''])
        rows.append(['CÓDIGOS — PROBLEMAS DE COLUMNA (fondo suave pastel + encabezado tintado)', ''])
        rows.append(['CONSTANTE', 'Columna entera con un único valor — fondo pastel en toda la columna'])
        rows.append(['QUASI_CONSTANTE', f'Un valor concentra ≥{QUASI_CONSTANT_THRESHOLD}% de la columna — fondo pastel'])
        rows.append(['COL_IDENTICA', 'Columna con valores exactamente iguales a otra — fondo pastel'])
        rows.append(['', ''])
        rows.append(['CÓDIGOS — val_FILA', ''])
        rows.append(['MISSING_EXCESIVO (val_FILA)', f'Participante con ≥{PARTICIPANT_EXCESSIVE_MISSING_THRESHOLD}% de ítems missing'])
        rows.append(['COLORES', ''])
        rows.append(['Azul (#1976D2)', 'participant_id_vars — Identificación del Participante'])
        rows.append(['Verde (#388E3C)', 'other_relevant_vars — Otras Variables Relevantes'])
        rows.append(['Naranja (#F57C00)', 'response_vars — Respuestas / Ítems'])
        rows.append(['Púrpura (#7B1FA2)', 'metadata_vars — Metadata / Complementarias'])

        return pd.DataFrame(rows, columns=['Métrica', 'Valor'])

    # ------------------------------------------------------------------ #
    #  Hoja 3: item configs                                                #
    # ------------------------------------------------------------------ #

    def _create_item_configs_sheet(
        self,
        categorization: RespuestasCategorization,
        response_types: List[Dict]
    ) -> pd.DataFrame:
        rows = []

        # Sección 1: por ítem
        rows.append({'Sección': 'CONFIG POR ÍTEM', 'Variable': '', 'Tipo_Respuesta': '',
                     'Valores_Válidos': '', 'Valores_Missing': '', 'Missing_Incluye_Vacío': ''})

        for var in categorization.response_vars:
            item_config = categorization.get_item_config(var)
            tipo = ''
            valid_str = ''
            missing_str = ''
            includes_empty = ''

            if response_types:
                for rt in response_types:
                    if var in rt.get('item_names', []):
                        tipo = rt.get('label', '')
                        break

            if item_config:
                valid_str   = ', '.join(str(v) for v in item_config.valid_values)
                missing_str = ', '.join(str(v) for v in item_config.missing_values)
                includes_empty = 'SÍ' if item_config.missing_includes_empty else 'NO'

            rows.append({
                'Sección': '',
                'Variable': var,
                'Tipo_Respuesta': tipo,
                'Valores_Válidos': valid_str,
                'Valores_Missing': missing_str,
                'Missing_Incluye_Vacío': includes_empty
            })

        # Sección 2: tipos de respuesta (templates)
        if response_types:
            rows.append({'Sección': '', 'Variable': '', 'Tipo_Respuesta': '',
                         'Valores_Válidos': '', 'Valores_Missing': '', 'Missing_Incluye_Vacío': ''})
            rows.append({'Sección': 'TIPOS DE RESPUESTA (templates)', 'Variable': '',
                         'Tipo_Respuesta': '', 'Valores_Válidos': '', 'Valores_Missing': '',
                         'Missing_Incluye_Vacío': ''})

            for rt in response_types:
                item_names = ', '.join(rt.get('item_names', []))
                rows.append({
                    'Sección': '',
                    'Variable': item_names,
                    'Tipo_Respuesta': rt.get('label', ''),
                    'Valores_Válidos': ', '.join(str(v) for v in rt.get('valid_values', [])),
                    'Valores_Missing': ', '.join(str(v) for v in rt.get('missing_values', [])),
                    'Missing_Incluye_Vacío': 'SÍ' if rt.get('missing_includes_empty') else 'NO'
                })

        return pd.DataFrame(rows, columns=['Sección', 'Variable', 'Tipo_Respuesta',
                                           'Valores_Válidos', 'Valores_Missing', 'Missing_Incluye_Vacío'])

    # ------------------------------------------------------------------ #
    #  Hoja 4: duplicados (re-detectado, sin truncar)                      #
    # ------------------------------------------------------------------ #

    def _create_duplicates_sheet(
        self,
        data: pd.DataFrame,
        categorization: RespuestasCategorization
    ) -> pd.DataFrame:
        id_cols = [c for c in categorization.participant_id_vars if c in data.columns]
        all_data_cols = list(data.columns)

        if not id_cols:
            return pd.DataFrame([['No se definieron variables de ID de participante']],
                                 columns=['Información'])

        compare_cols = [c for c in all_data_cols if c not in id_cols]
        dup_mask = data.duplicated(subset=id_cols, keep=False)
        dup_rows = data[dup_mask]

        if len(dup_rows) == 0:
            return pd.DataFrame([['Sin duplicados detectados']], columns=['Información'])

        rows = []
        group_num = 0
        grouped = dup_rows.groupby(id_cols, dropna=False)
        for group_key, group_df in grouped:
            group_num += 1
            if compare_cols:
                all_equal = group_df[compare_cols].apply(
                    lambda col: col.fillna('__NA__').nunique() == 1
                ).all()
            else:
                all_equal = True

            tipo = 'CLON' if all_equal else 'SIMPLE'

            if isinstance(group_key, (list, tuple)):
                id_display = ' | '.join(str(v) for v in group_key)
            else:
                id_display = str(group_key)

            for row_idx in group_df.index.tolist():
                rows.append({
                    'Grupo': group_num,
                    'Tipo': tipo,
                    'Valor_ID': id_display,
                    'Nro_Fila_Original': row_idx + 2,  # +1 header +1 0-indexed
                    'Total_en_Grupo': len(group_df)
                })

        cols = ['Grupo', 'Tipo', 'Valor_ID', 'Nro_Fila_Original', 'Total_en_Grupo']
        return pd.DataFrame(rows, columns=cols) if rows else pd.DataFrame(columns=cols)

    # ------------------------------------------------------------------ #
    #  Hoja 5: fuera de rango (re-detectado, sin truncar)                  #
    # ------------------------------------------------------------------ #

    def _create_out_of_range_sheet(
        self,
        data: pd.DataFrame,
        categorization: RespuestasCategorization
    ) -> pd.DataFrame:
        rows = []

        for var in categorization.response_vars:
            if var not in data.columns:
                continue
            item_config = categorization.get_item_config(var)
            if not item_config or not item_config.valid_values:
                continue

            valid_set   = {str(v) for v in item_config.valid_values}
            missing_set = {str(v) for v in item_config.missing_values}
            validos_str  = ', '.join(str(v) for v in item_config.valid_values)
            missing_str  = ', '.join(str(v) for v in item_config.missing_values)

            for idx, value in data[var].items():
                code = self._classify_response_cell(
                    value, valid_set, missing_set, item_config.missing_includes_empty
                )
                if code == 'FUERA_RANGO':
                    str_val = '(vacío/NaN)' if pd.isna(value) else str(value)
                    rows.append({
                        'Nro_Fila_Original': idx + 2,
                        'Ítem': var,
                        'Valor_Encontrado': str_val,
                        'Valores_Válidos': validos_str,
                        'Valores_Missing': missing_str,
                        'Missing_Incluye_Vacío': 'SÍ' if item_config.missing_includes_empty else 'NO'
                    })

        cols = ['Nro_Fila_Original', 'Ítem', 'Valor_Encontrado',
                'Valores_Válidos', 'Valores_Missing', 'Missing_Incluye_Vacío']
        if not rows:
            return pd.DataFrame([['Sin valores fuera de rango detectados']], columns=['Información'])
        return pd.DataFrame(rows, columns=cols).sort_values('Nro_Fila_Original').reset_index(drop=True)

    # ------------------------------------------------------------------ #
    #  Hoja 6: missing por participante (re-computado, sin truncar)        #
    # ------------------------------------------------------------------ #

    def _create_missing_per_participant_sheet(
        self,
        data: pd.DataFrame,
        categorization: RespuestasCategorization
    ) -> pd.DataFrame:
        response_cols = [c for c in categorization.response_vars if c in data.columns]
        id_cols       = [c for c in categorization.participant_id_vars if c in data.columns]

        if not response_cols:
            return pd.DataFrame([['No se definieron variables de respuesta']], columns=['Información'])

        rows = []
        for row_idx, row in data.iterrows():
            missing_in_row = 0
            for var in response_cols:
                item_config = categorization.get_item_config(var)
                val = row.get(var)
                if item_config:
                    valid_set   = {str(v) for v in item_config.valid_values}
                    missing_set = {str(v) for v in item_config.missing_values}
                    code = self._classify_response_cell(val, valid_set, missing_set, item_config.missing_includes_empty)
                    if code == 'MISSING':
                        missing_in_row += 1
                else:
                    if pd.isna(val):
                        missing_in_row += 1

            if missing_in_row == 0:
                continue

            pct = round((missing_in_row / len(response_cols)) * 100, 2)
            id_str = ' | '.join(str(row.get(c, '')) for c in id_cols) if id_cols else str(row_idx)

            rows.append({
                'Nro_Fila_Original': row_idx + 2,
                'ID_Participante': id_str,
                'Total_Missing': missing_in_row,
                'Total_Ítems': len(response_cols),
                '% Missing': pct,
                'Excesivo': 'SÍ' if pct >= PARTICIPANT_EXCESSIVE_MISSING_THRESHOLD else 'NO'
            })

        cols = ['Nro_Fila_Original', 'ID_Participante', 'Total_Missing', 'Total_Ítems', '% Missing', 'Excesivo']
        if not rows:
            return pd.DataFrame([['Sin participantes con missing detectados']], columns=['Información'])

        df = pd.DataFrame(rows, columns=cols)
        return df.sort_values('% Missing', ascending=False).reset_index(drop=True)

    # ------------------------------------------------------------------ #
    #  Hoja 7: variabilidad (desde results, no trunca)                     #
    # ------------------------------------------------------------------ #

    def _create_variability_sheet(self, validation_results: Dict) -> pd.DataFrame:
        var_res = validation_results.get('variability_validation', {})
        rows = []

        for entry in var_res.get('constant_columns', []):
            rows.append({
                'Columna': entry.get('column', ''),
                'Tipo': 'CONSTANTE',
                'Valor_Dominante': entry.get('value', ''),
                '% Dominante': 100.0,
                'Valores_Únicos': 1,
                'Total_Filas': entry.get('total', '')
            })

        for entry in var_res.get('quasi_constant_columns', []):
            rows.append({
                'Columna': entry.get('column', ''),
                'Tipo': 'QUASI_CONSTANTE',
                'Valor_Dominante': entry.get('dominant_value', ''),
                '% Dominante': entry.get('dominant_percentage', ''),
                'Valores_Únicos': entry.get('unique_values', ''),
                'Total_Filas': entry.get('total', '')
            })

        cols = ['Columna', 'Tipo', 'Valor_Dominante', '% Dominante', 'Valores_Únicos', 'Total_Filas']
        if not rows:
            return pd.DataFrame([['Sin columnas con problemas de variabilidad']], columns=['Información'])
        return pd.DataFrame(rows, columns=cols)

    # ------------------------------------------------------------------ #
    #  Hoja 8: columnas idénticas (desde results, no trunca)               #
    # ------------------------------------------------------------------ #

    def _create_identical_columns_sheet(self, validation_results: Dict) -> pd.DataFrame:
        id_col_res = validation_results.get('identical_columns_validation', {})
        rows = []

        for group_num, pair in enumerate(id_col_res.get('identical_pairs', []), start=1):
            columns_in_group = pair.get('columns', [])
            sample = pair.get('sample_values', [])
            sample_str = ', '.join(str(v) for v in sample[:5])
            for col in columns_in_group:
                rows.append({
                    'Grupo': group_num,
                    'Columna': col,
                    'Tamaño_Grupo': len(columns_in_group),
                    'Muestra_Valores': sample_str
                })

        cols = ['Grupo', 'Columna', 'Tamaño_Grupo', 'Muestra_Valores']
        if not rows:
            return pd.DataFrame([['Sin columnas idénticas detectadas']], columns=['Información'])
        return pd.DataFrame(rows, columns=cols)

    # ------------------------------------------------------------------ #
    #  Hoja 9: mapa de columnas renombradas por pandas                     #
    # ------------------------------------------------------------------ #

    def _create_duplicate_names_sheet(
        self,
        original_data: pd.DataFrame,
        categorization: RespuestasCategorization
    ) -> pd.DataFrame:
        """
        Mapa de renombrado: pandas auto-renombra columnas duplicadas en el archivo original
        (e.g., si i4 aparece dos veces → i4 y i4.1).
        Muestra todas las variables categorizadas con su nombre modificado o 'No Aplica'.
        """
        import re
        rename_pattern = re.compile(r'^(.+)\.(\d+)$')

        # Detectar columnas renombradas en el DataFrame
        renamed_map: Dict[str, str] = {}  # col_en_df -> nombre_original_inferido
        for col in original_data.columns:
            m = rename_pattern.match(str(col))
            if m:
                renamed_map[col] = m.group(1)

        if not renamed_map:
            return pd.DataFrame(
                [['Sin columnas renombradas detectadas (no hay nombres duplicados en el archivo original)']],
                columns=['Información']
            )

        # Mostrar todas las variables categorizadas con su estado de renombrado
        all_vars = (
            categorization.participant_id_vars +
            categorization.other_relevant_vars +
            categorization.response_vars +
            categorization.metadata_vars
        )
        rows = []
        for col in all_vars:
            if col not in original_data.columns:
                continue
            if col in renamed_map:
                rows.append({'Nombre_Variable': renamed_map[col], 'Nombre_Modificado': col})
            else:
                rows.append({'Nombre_Variable': col, 'Nombre_Modificado': 'No Aplica'})

        cols = ['Nombre_Variable', 'Nombre_Modificado']
        if not rows:
            return pd.DataFrame([['Sin variables categorizadas con columnas renombradas']], columns=['Información'])
        return pd.DataFrame(rows, columns=cols)

    # ------------------------------------------------------------------ #
    #  Formatting (colores, freeze panes, autofilter, anchos)             #
    # ------------------------------------------------------------------ #

    def _fill_type_for_cell(self, code: str) -> Optional[str]:
        """'solid' para errores de celda, 'soft' para problemas de columna, None para MISSING/OK."""
        codes = set(code.split('+'))
        if codes & CELL_LEVEL_FILL_CODES:
            return 'solid'
        if codes & COLUMN_LEVEL_FILL_CODES:
            return 'soft'
        return None

    def _should_color_val_cell(self, code: str) -> bool:
        """True si val_* debe mostrar el código en color de categoría (no gris).
        MISSING declarado se muestra en gris — no es un error."""
        non_problem = {'OK', 'MISSING'}
        return bool(set(code.split('+')) - non_problem)

    def _apply_excel_formatting(
        self,
        file_path: str,
        annotated_data: pd.DataFrame,
        categorization: RespuestasCategorization,
        cell_problems: Dict[str, Dict[int, str]],
        row_problems: Dict[int, str]
    ):
        wb = load_workbook(file_path)

        # --- Hoja 1: Datos_Validacion ---
        ws = wb['Datos_Validacion']

        var_to_category = {}
        for cat_key, vars_list in [
            ('participant_id_vars', categorization.participant_id_vars),
            ('other_relevant_vars', categorization.other_relevant_vars),
            ('response_vars',       categorization.response_vars),
            ('metadata_vars',       categorization.metadata_vars),
        ]:
            for var in vars_list:
                var_to_category[var] = cat_key

        col_name_to_excel_idx = {
            col_name: idx for idx, col_name in enumerate(annotated_data.columns, start=1)
        }

        # 1a. Colorear celdas problemáticas en columnas originales
        # - Errores de celda (FUERA_RANGO, DUPLICADO_ID, CLON_FILA): fill sólido + fuente blanca
        # - Problemas de columna (CONSTANTE, QUASI_CONSTANTE, COL_IDENTICA): fill pastel + encabezado sólido
        # - MISSING declarado: sin fill (es comportamiento esperado)
        col_level_vars: set = set()  # acumula vars con problema de columna para colorear encabezado

        for var, problems in cell_problems.items():
            if var not in col_name_to_excel_idx:
                continue
            category = var_to_category.get(var)
            if not category or category not in CATEGORY_COLORS:
                continue
            solid_color = CATEGORY_COLORS[category]
            light_color = CATEGORY_COLORS_LIGHT[category]
            solid_fill  = PatternFill(start_color=solid_color, end_color=solid_color, fill_type='solid')
            light_fill  = PatternFill(start_color=light_color, end_color=light_color, fill_type='solid')

            for row_idx, code in problems.items():
                fill_type = self._fill_type_for_cell(code)
                if fill_type is None:
                    continue
                cell = ws.cell(row=row_idx + 2, column=col_name_to_excel_idx[var])
                if fill_type == 'solid':
                    cell.fill = solid_fill
                    cell.font = Font(color='FFFFFFFF', bold=True)
                else:  # soft — problema a nivel de columna
                    cell.fill = light_fill
                    col_level_vars.add(var)

        # Colorear encabezados de columnas con problemas estructurales (suave más visible en row 1)
        for var in col_level_vars:
            if var not in col_name_to_excel_idx:
                continue
            category = var_to_category.get(var)
            if not category or category not in CATEGORY_COLORS:
                continue
            light_color = CATEGORY_COLORS_LIGHT[category]
            light_fill  = PatternFill(start_color=light_color, end_color=light_color, fill_type='solid')
            ws.cell(row=1, column=col_name_to_excel_idx[var]).fill = light_fill

        # 1b. Colorear texto de columnas val_*
        # MISSING declarado → gris (mismo que OK); cualquier otro código → color de categoría.
        for col_name in annotated_data.columns:
            if not col_name.startswith('val_') or col_name == 'val_FILA':
                continue
            original_var = col_name[4:]
            category = var_to_category.get(original_var)
            if not category or category not in CATEGORY_COLORS:
                continue
            color = CATEGORY_COLORS[category]
            excel_col = col_name_to_excel_idx[col_name]
            font_colored = Font(color=color, bold=True)
            font_ok      = Font(color=OK_FONT_GRAY, bold=False)
            for row_num in range(2, len(annotated_data) + 2):
                cell = ws.cell(row=row_num, column=excel_col)
                val = str(cell.value).strip() if cell.value is not None else 'OK'
                cell.font = font_colored if self._should_color_val_cell(val) else font_ok

        # 1c. Colorear val_FILA
        if 'val_FILA' in col_name_to_excel_idx:
            excel_col   = col_name_to_excel_idx['val_FILA']
            font_red    = Font(color=ROW_PROBLEM_RED, bold=True)
            font_ok     = Font(color=OK_FONT_GRAY, bold=False)
            for row_num in range(2, len(annotated_data) + 2):
                cell = ws.cell(row=row_num, column=excel_col)
                val = str(cell.value).strip() if cell.value is not None else 'OK'
                cell.font = font_ok if val == 'OK' else font_red

        # 1d. Freeze panes y autofilter en Datos_Validacion
        ws.freeze_panes = 'A2'
        ws.auto_filter.ref = ws.dimensions

        # 1e. Prefijar valores que Excel interpretaría como fórmulas
        for row in ws.iter_rows(min_row=2):
            for cell in row:
                if cell.value and isinstance(cell.value, str) and cell.value[0] in ('=', '+', '-', '@'):
                    cell.value = f"'{cell.value}"

        # 1f. Ancho de columnas básico (datos originales: 14; val_*: 18; val_FILA: 20)
        for col_num, col_name in enumerate(annotated_data.columns, start=1):
            col_letter = get_column_letter(col_num)
            if col_name == 'val_FILA':
                ws.column_dimensions[col_letter].width = 22
            elif col_name.startswith('val_'):
                ws.column_dimensions[col_letter].width = max(18, len(col_name) + 2)
            else:
                ws.column_dimensions[col_letter].width = max(14, len(col_name) + 2)

        # --- Hojas de detalle: freeze panes y anchos ---
        detail_sheets = [
            'Resumen_Validacion', 'Item_Configs', 'Duplicados_ID',
            'Fuera_Rango_Detalle', 'Missing_Por_Participante',
            'Variabilidad', 'Columnas_Identicas', 'Nombres_Duplicados'
        ]
        for sheet_name in detail_sheets:
            if sheet_name not in wb.sheetnames:
                continue
            dws = wb[sheet_name]
            dws.freeze_panes = 'A2'
            if sheet_name == 'Resumen_Validacion':
                # Auto-fit basado en el contenido de todas las celdas (no solo encabezado)
                for col_cells in dws.columns:
                    max_w = max(
                        (len(str(cell.value)) for cell in col_cells if cell.value is not None),
                        default=14
                    )
                    dws.column_dimensions[get_column_letter(col_cells[0].column)].width = min(max_w + 4, 80)
            else:
                # Ancho automático basado en encabezado
                for col_cells in dws.columns:
                    header = str(col_cells[0].value) if col_cells[0].value else ''
                    dws.column_dimensions[get_column_letter(col_cells[0].column)].width = max(14, len(header) + 4)

        # --- Colorear filas con missing excesivo en Missing_Por_Participante ---
        if 'Missing_Por_Participante' in wb.sheetnames:
            ws_mp = wb['Missing_Por_Participante']
            header_row = [cell.value for cell in next(ws_mp.iter_rows(min_row=1, max_row=1))]
            if 'Excesivo' in header_row:
                excesivo_col = header_row.index('Excesivo')
                exc_fill = PatternFill(start_color='FFFFF3E0', end_color='FFFFF3E0', fill_type='solid')
                exc_font = Font(color='FFE65100', bold=True)
                for row in ws_mp.iter_rows(min_row=2):
                    if row[excesivo_col].value == 'SÍ':
                        for cell in row:
                            cell.fill = exc_fill
                        row[excesivo_col].font = exc_font

        # --- Colorear filas de leyenda en Resumen_Validacion ---
        # Detecta dinámicamente las filas que describen colores (sin hardcodear número de fila)
        if 'Resumen_Validacion' in wb.sheetnames:
            ws_res = wb['Resumen_Validacion']
            legend_colors = {
                'Azul':    'FF1976D2',
                'Verde':   'FF388E3C',
                'Naranja': 'FFF57C00',
                'Púrpura': 'FF7B1FA2',
            }
            for row in ws_res.iter_rows():
                cell_a = row[0]
                if not cell_a.value or not isinstance(cell_a.value, str):
                    continue
                for label, argb in legend_colors.items():
                    if cell_a.value.startswith(label) and '#' in cell_a.value:
                        fill = PatternFill(start_color=argb, end_color=argb, fill_type='solid')
                        for cell in row:
                            if cell.value is not None and str(cell.value).strip() != '':
                                cell.fill = fill
                                cell.font = Font(color='FFFFFFFF', bold=True)
                        break

        wb.save(file_path)

    # ------------------------------------------------------------------ #
    #  Infra                                                               #
    # ------------------------------------------------------------------ #

    def _get_db_manager(self):
        from flask import current_app
        if current_app.config.get('TESTING'):
            from ....core.database import DatabaseManager
            db_path = current_app.config.get('DATABASE_PATH', 'test.db')
            return DatabaseManager(db_path)
        else:
            from ....core.database import db_manager
            return db_manager
