import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { MenuBook, CheckCircle, AutoFixHigh } from '@mui/icons-material';
import axios from 'axios';
import { RespuestasItemConfig, LdCState } from '../../../core/ToolStateContext';

const LDC_NAME_CANDIDATES = ['nombre', 'variable', 'item', 'name', 'var', 'columna', 'variables'];
const LDC_VALUES_CANDIDATES = ['valores', 'valores_validos', 'valid_values', 'values', 'categorias', 'opciones'];
const LDC_MISSING_CANDIDATES = ['missing', 'missings', 'valores_missing', 'missing_values', 'perdidos', 'na'];
const TIPO_VALIDACION_CANDIDATES = ['tipo_validacion', 'tipo_val', 'type_val', 'categoria_var'];

// Vocabulario controlado: valor del LdC → caja de categorización
export const TIPO_VALIDACION_BOX_DEFAULTS: Record<string, string> = {
  'id_participante': 'participant_id_vars',
  'id': 'participant_id_vars', // definitiva
  'identificador': 'participant_id_vars',
  'identificacion': 'participant_id_vars',
  'respuesta': 'response_vars',
  'respuestas': 'response_vars',
  'item': 'response_vars',  // definitiva
  'items': 'response_vars',
  'itemes': 'response_vars',
  'metadata': 'metadata_vars',
  'metadatas': 'metadata_vars',
  'contexto': 'metadata_vars',
  'complementaria': 'metadata_vars',  // definitiva
  'complementarias': 'metadata_vars',
  'complementario': 'metadata_vars',
  'complementarios': 'metadata_vars',
  'relevante': 'other_relevant_vars',
  'relevantes': 'other_relevant_vars',
  'otro_relevante': 'other_relevant_vars',
  'otro': 'other_relevant_vars',
  'otros': 'other_relevant_vars',
  'otra': 'other_relevant_vars',  // definitiva
  'otras': 'other_relevant_vars',
};

const NOT_APPLICABLE_VALUES = ['no aplica', 'n/a', 'na', 'no_aplica', 'not applicable', '-', 'ninguno'];

export interface LdCSuggestedCategorization {
  response_vars: string[];
  non_response_vars: string[];
  unmatched_vars: string[];
  // Campos enriquecidos por tipo_validacion (presentes cuando has_tipo_validacion = true)
  participant_id_vars: string[];
  other_relevant_vars_from_ldc: string[];
  metadata_vars_from_ldc: string[];
  has_tipo_validacion: boolean;
}

interface LdCUploadProps {
  ldcState: LdCState | null;
  onLdCParsed: (state: LdCState, configs: RespuestasItemConfig[], suggested: LdCSuggestedCategorization) => void;
  onLdCRemoved: () => void;
  responseVariables: string[];
}

// Normaliza: minúsculas + sin tildes/diacríticos
function normalizeStr(str: string): string {
  return str.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Retorna la primera columna que coincide con algún candidato (orden de candidatos)
function autoDetectColumn(columns: string[], candidates: string[]): string | null {
  for (const candidate of candidates) {
    const normCand = normalizeStr(candidate);
    const found = columns.find(c => normalizeStr(c) === normCand);
    if (found) return found;
  }
  return null;
}

// Retorna TODAS las columnas que coinciden con algún candidato (para detectar conflictos)
function detectAllMatches(columns: string[], candidates: string[]): string[] {
  const normCandidates = new Set(candidates.map(normalizeStr));
  return columns.filter(c => normCandidates.has(normalizeStr(c)));
}

function parseValuesCell(value: any): string[] {
  if (!value || value === '' || (typeof value === 'number' && isNaN(value))) return [];
  const str = String(value).trim();
  if (!str) return [];
  return str.split(',').map(v => v.trim()).filter(v => v.length > 0);
}

function parseMissingCell(value: any): { values: string[]; includesEmpty: boolean } {
  if (!value || value === '' || (typeof value === 'number' && isNaN(value))) {
    return { values: [], includesEmpty: false };
  }
  const str = String(value).trim().toLowerCase();

  let includesEmpty = false;
  const parts = String(value).split(',').map(v => v.trim()).filter(v => v.length > 0);
  const values: string[] = [];

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower === 'vacío' || lower === 'vacio' || lower === 'empty' || lower === 'na' || lower === 'nan') {
      includesEmpty = true;
    } else {
      values.push(part);
    }
  }

  return { values, includesEmpty };
}

const LdCUpload: React.FC<LdCUploadProps> = ({
  ldcState,
  onLdCParsed,
  onLdCRemoved,
  responseVariables
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [ldcData, setLdcData] = useState<any>(null);
  const [ldcColumns, setLdcColumns] = useState<string[]>([]);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [nameCol, setNameCol] = useState<string | null>(null);
  const [valuesCol, setValuesCol] = useState<string | null>(null);
  const [missingCol, setMissingCol] = useState<string | null>(null);
  const [autoDetected, setAutoDetected] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [tipoValidacionCol, setTipoValidacionCol] = useState<string | null>(null);
  const [tipoValidacionMatches, setTipoValidacionMatches] = useState<string[]>([]);

  const uploadAndParse = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const uploadResp = await axios.post('/api/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded * 100) / e.total));
        }
      });

      const uploadData = uploadResp.data;

      let sheetName: string | undefined;
      if (uploadData.is_excel && uploadData.sheet_names?.length > 0) {
        sheetName = uploadData.sheet_names[0];
      }

      const parseResp = await axios.post(`/api/files/${uploadData.upload_id}/parse`,
        sheetName ? { sheet_name: sheetName } : {},
        { headers: { 'Content-Type': 'application/json' } }
      );

      const parseData = parseResp.data;
      const columns = parseData.variables || [];

      setLdcColumns(columns);

      const detectedName = autoDetectColumn(columns, LDC_NAME_CANDIDATES);
      const detectedValues = autoDetectColumn(columns, LDC_VALUES_CANDIDATES);
      const detectedMissing = autoDetectColumn(columns, LDC_MISSING_CANDIDATES);

      setNameCol(detectedName);
      setValuesCol(detectedValues);
      setMissingCol(detectedMissing);

      const allDetected = !!(detectedName && detectedValues && detectedMissing);
      setAutoDetected(allDetected);

      const tipoMatches = detectAllMatches(columns, TIPO_VALIDACION_CANDIDATES);
      setTipoValidacionMatches(tipoMatches);
      // Pre-seleccionar solo si hay exactamente una coincidencia (sin ambigüedad)
      setTipoValidacionCol(tipoMatches.length === 1 ? tipoMatches[0] : null);

      const previewResp = await axios.post(`/api/files/${uploadData.upload_id}/preview`, {
        sheet_name: sheetName,
        start_row: 0,
        rows_per_page: 5
      }, { headers: { 'Content-Type': 'application/json' } });

      setPreview(previewResp.data.preview_data || []);
      setLdcData({
        uploadId: uploadData.upload_id,
        filename: uploadData.filename,
        sheetName,
        columns
      });

      setShowMappingDialog(true);

    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al procesar libro de códigos');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) uploadAndParse(e.target.files[0]);
  };

  const handleConfirmMapping = async () => {
    if (!nameCol || !valuesCol || !missingCol || !ldcData) return;

    try {
      const fullDataResp = await axios.post(`/api/files/${ldcData.uploadId}/preview`, {
        sheet_name: ldcData.sheetName,
        start_row: 0,
        rows_per_page: 10000
      }, { headers: { 'Content-Type': 'application/json' } });

      const rows = fullDataResp.data.preview_data || [];

      const configs: RespuestasItemConfig[] = [];
      const allVarsLower = new Set(responseVariables.map(v => v.toLowerCase()));
      let matchCount = 0;
      const suggestedResponseVars: string[] = [];
      const suggestedNonResponseVars: string[] = [];
      const matchedVarNames = new Set<string>();

      for (const row of rows) {
        const itemName = String(row[nameCol] || '').trim();
        if (!itemName) continue;

        const matchesBase = allVarsLower.has(itemName.toLowerCase());
        const originalName = responseVariables.find(
          v => v.toLowerCase() === itemName.toLowerCase()
        );

        if (matchesBase && originalName) {
          matchedVarNames.add(originalName);
          const parsedValues = parseValuesCell(row[valuesCol]);
          const parsedMissing = parseMissingCell(row[missingCol]);
          const rawMissing = String(row[missingCol] || '').trim().toLowerCase();

          const isNotApplicable = NOT_APPLICABLE_VALUES.includes(rawMissing);

          if (isNotApplicable) {
            suggestedNonResponseVars.push(originalName);
          } else {
            suggestedResponseVars.push(originalName);
            configs.push({
              variable: originalName,
              valid_values: parsedValues,
              missing_values: parsedMissing.values,
              missing_includes_empty: parsedMissing.includesEmpty
            });
          }
          matchCount++;
        }
      }

      const unmatchedVars = responseVariables.filter(v => !matchedVarNames.has(v));

      const suggested: LdCSuggestedCategorization = {
        response_vars: suggestedResponseVars,
        non_response_vars: suggestedNonResponseVars,
        unmatched_vars: unmatchedVars,
        participant_id_vars: [],
        other_relevant_vars_from_ldc: [],
        metadata_vars_from_ldc: [],
        has_tipo_validacion: false
      };

      // Construir mapa tipo_validacion desde el LdC completo (sin filtrar por base).
      // Las claves son los nombres del LdC tal como aparecen; el matching contra la
      // base se hace después en computeTipoValidacionSuggested (case + tilde insensitive).
      let tipoMap: Record<string, string> | null = null;
      if (tipoValidacionCol) {
        tipoMap = {};
        for (const row of rows) {
          const itemName = String(row[nameCol] || '').trim();
          const tipoValue = normalizeStr(String(row[tipoValidacionCol] || ''));
          if (!itemName || !tipoValue) continue;
          tipoMap[itemName] = tipoValue;
        }
        if (Object.keys(tipoMap).length === 0) tipoMap = null;
      }

      const ldcNewState: LdCState = {
        uploadId: ldcData.uploadId,
        filename: ldcData.filename,
        mapping: {
          name_column: nameCol,
          values_column: valuesCol,
          missing_column: missingCol
        },
        parsed: true,
        columns: ldcColumns,
        autoDetected,
        raw_rows: rows,
        tipo_validacion_column: tipoValidacionCol,
        tipo_validacion_map: tipoMap
      };

      onLdCParsed(ldcNewState, configs, suggested);
      setShowMappingDialog(false);
      setError(null);

      // Solo mostrar advertencia de sin-coincidencias cuando el archivo base ya fue cargado
      if (matchCount === 0 && responseVariables.length > 0) {
        setError('El libro de códigos no coincide con ninguna variable de la base. Verifica los nombres.');
      }

    } catch (err: any) {
      setError(err.response?.data?.error || 'Error procesando libro de códigos');
    }
  };

  if (ldcState?.parsed) {
    return (
      <Paper sx={{ p: 2, mb: 2, backgroundColor: 'success.light', color: 'success.contrastText' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <CheckCircle />
            <Typography variant="subtitle1">
              Libro de Códigos: {ldcState.filename}
            </Typography>
            <Chip
              label={ldcState.autoDetected ? 'Auto-detectado' : 'Mapeo manual'}
              size="small"
              sx={{ backgroundColor: 'rgba(255,255,255,0.3)' }}
            />
          </Box>
          <Button size="small" color="inherit" onClick={onLdCRemoved}>
            Quitar
          </Button>
        </Box>
      </Paper>
    );
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Paper sx={{ p: 2, border: '1px dashed #ccc' }}>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <MenuBook color="action" />
          <Typography variant="subtitle1">
            Libro de Códigos (opcional)
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Sube un archivo con las columnas: nombre del ítem, valores válidos, y valores missing.
          Esto pre-configurará automáticamente cada ítem.
        </Typography>

        <input
          type="file"
          id="ldc-upload"
          accept=".csv,.txt,.xls,.xlsx"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          disabled={uploading}
        />
        <Button
          variant="outlined"
          component="label"
          htmlFor="ldc-upload"
          disabled={uploading}
          startIcon={<AutoFixHigh />}
          size="small"
        >
          Subir Libro de Códigos
        </Button>

        {uploading && (
          <Box sx={{ mt: 1 }}>
            <LinearProgress variant="determinate" value={uploadProgress} />
          </Box>
        )}

        {error && <Alert severity="warning" sx={{ mt: 1 }}>{error}</Alert>}
      </Paper>

      <Dialog open={showMappingDialog} onClose={() => setShowMappingDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Mapeo de columnas del Libro de Códigos
          {autoDetected && (
            <Chip label="Columnas auto-detectadas" color="success" size="small" sx={{ ml: 1 }} />
          )}
        </DialogTitle>
        <DialogContent>
          {preview.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>Vista previa:</Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 200 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      {ldcColumns.map(col => (
                        <TableCell key={col} sx={{ fontWeight: 'bold' }}>{col}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {preview.map((row, i) => (
                      <TableRow key={i}>
                        {ldcColumns.map(col => (
                          <TableCell key={col}>{String(row[col] || '')}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          <Typography variant="subtitle2" gutterBottom>
            Indica qué columna del LdC corresponde a cada campo:
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Columna "Nombre" (nombre del ítem/variable)</InputLabel>
              <Select
                value={nameCol || ''}
                label='Columna "Nombre" (nombre del ítem/variable)'
                onChange={(e) => setNameCol(e.target.value || null)}
              >
                {ldcColumns.map(col => (
                  <MenuItem key={col} value={col}>{col}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Columna "Valores" (valores válidos)</InputLabel>
              <Select
                value={valuesCol || ''}
                label='Columna "Valores" (valores válidos)'
                onChange={(e) => setValuesCol(e.target.value || null)}
              >
                {ldcColumns.map(col => (
                  <MenuItem key={col} value={col}>{col}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Columna "Missing" (valores missing)</InputLabel>
              <Select
                value={missingCol || ''}
                label='Columna "Missing" (valores missing)'
                onChange={(e) => setMissingCol(e.target.value || null)}
              >
                {ldcColumns.map(col => (
                  <MenuItem key={col} value={col}>{col}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {tipoValidacionMatches.length > 0 && (
              <Box>
                {tipoValidacionMatches.length > 1 && (
                  <Alert severity="warning" sx={{ mb: 1 }}>
                    Se detectaron <strong>{tipoValidacionMatches.length} columnas posibles</strong> para
                    tipo de validación ({tipoValidacionMatches.join(', ')}). Selecciona cuál usar o elige
                    "No usar" para ignorarlas.
                  </Alert>
                )}
                <FormControl fullWidth>
                  <InputLabel>Columna "Tipo de validación" (categorización automática)</InputLabel>
                  <Select
                    value={tipoValidacionCol || ''}
                    label='Columna "Tipo de validación" (categorización automática)'
                    onChange={(e) => setTipoValidacionCol(e.target.value || null)}
                  >
                    <MenuItem value=""><em>No usar</em></MenuItem>
                    {ldcColumns.map(col => (
                      <MenuItem key={col} value={col}>{col}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowMappingDialog(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleConfirmMapping}
            disabled={!nameCol || !valuesCol || !missingCol}
          >
            Confirmar y Aplicar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

/**
 * Ejecuta el matching del LdC contra un conjunto de variables del archivo base.
 * Función pura reutilizable para re-matching cuando cambia el archivo base.
 */
export function runLdCMatching(
  rows: any[],
  nameCol: string,
  valuesCol: string,
  missingCol: string,
  responseVariables: string[]
): { configs: RespuestasItemConfig[]; suggested: LdCSuggestedCategorization } {
  const allVarsNorm = new Map(responseVariables.map(v => [normalizeStr(v), v]));
  const configs: RespuestasItemConfig[] = [];
  const suggestedResponseVars: string[] = [];
  const suggestedNonResponseVars: string[] = [];
  const matchedVarNames = new Set<string>();

  for (const row of rows) {
    const itemName = String(row[nameCol] || '').trim();
    if (!itemName) continue;

    const originalName = allVarsNorm.get(normalizeStr(itemName));
    if (!originalName) continue;

    matchedVarNames.add(originalName);
    const parsedValues = parseValuesCell(row[valuesCol]);
    const parsedMissing = parseMissingCell(row[missingCol]);
    const rawMissing = String(row[missingCol] || '').trim().toLowerCase();
    const isNotApplicable = NOT_APPLICABLE_VALUES.includes(rawMissing);

    if (isNotApplicable) {
      suggestedNonResponseVars.push(originalName);
    } else {
      suggestedResponseVars.push(originalName);
      configs.push({
        variable: originalName,
        valid_values: parsedValues,
        missing_values: parsedMissing.values,
        missing_includes_empty: parsedMissing.includesEmpty
      });
    }
  }

  const unmatchedVars = responseVariables.filter(v => !matchedVarNames.has(v));
  return {
    configs,
    suggested: {
      response_vars: suggestedResponseVars,
      non_response_vars: suggestedNonResponseVars,
      unmatched_vars: unmatchedVars,
      participant_id_vars: [],
      other_relevant_vars_from_ldc: [],
      metadata_vars_from_ldc: [],
      has_tipo_validacion: false
    }
  };
}

/**
 * Calcula la categorización sugerida a partir del mapa tipo_validacion del LdC.
 * Usa el vocabulario controlado TIPO_VALIDACION_BOX_DEFAULTS para asignar cada variable a su caja.
 */
export function computeTipoValidacionSuggested(
  tipoMap: Record<string, string>,
  allVariables: string[]
): LdCSuggestedCategorization {
  const participant_id_vars: string[] = [];
  const response_vars: string[] = [];
  const other_relevant_vars: string[] = [];
  const metadata_vars: string[] = [];
  const mapped = new Set<string>();
  // Match con normalización: case-insensitive + sin tildes
  const allVarsNorm = new Map(allVariables.map(v => [normalizeStr(v), v]));

  for (const [ldcVar, tipoValue] of Object.entries(tipoMap)) {
    const originalVar = allVarsNorm.get(normalizeStr(ldcVar));
    if (!originalVar) continue;
    // tipoValue ya viene normalizado desde handleConfirmMapping
    const box = TIPO_VALIDACION_BOX_DEFAULTS[tipoValue] ?? null;
    if (box === 'participant_id_vars') participant_id_vars.push(originalVar);
    else if (box === 'response_vars') response_vars.push(originalVar);
    else if (box === 'other_relevant_vars') other_relevant_vars.push(originalVar);
    else if (box === 'metadata_vars') metadata_vars.push(originalVar);
    if (box) mapped.add(originalVar);
  }

  return {
    participant_id_vars,
    response_vars,
    non_response_vars: [],
    other_relevant_vars_from_ldc: other_relevant_vars,
    metadata_vars_from_ldc: metadata_vars,
    unmatched_vars: allVariables.filter(v => !mapped.has(v)),
    has_tipo_validacion: true
  };
}

export default LdCUpload;
