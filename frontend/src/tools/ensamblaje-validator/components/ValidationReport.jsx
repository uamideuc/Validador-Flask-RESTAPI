import React, { useState } from 'react';
import {
  Box, Typography, Paper, Alert, AlertTitle, Accordion, AccordionSummary, AccordionDetails, Chip, Grid, Card, CardContent, CircularProgress,
  Table, TableContainer, TableHead, TableRow, TableCell, TableBody
} from '@mui/material';
import { Tune } from '@mui/icons-material';
import ClassificationValuesModal from './ClassificationValuesModal';
import CriticalVariablesAnalysis from './CriticalVariablesAnalysis';
import IdVariablesAnalysis from './IdVariablesAnalysis';

// Helper para mostrar nombres de instrumentos amigables al usuario
const getInstrumentDisplayName = (instrumentKey, instrumentsDetail = {}) => {
  if (instrumentKey === 'default_instrument') {
    return 'Toda la base de datos';
  }
  
  // Intentar usar el display_name del backend si existe
  const instrumentDetail = instrumentsDetail[instrumentKey];
  if (instrumentDetail && instrumentDetail.display_name) {
    return instrumentDetail.display_name;
  }
  
  // Fallback: formatear la clave técnica de forma más legible
  if (instrumentKey.includes('|')) {
    return instrumentKey
      .split('|')
      .map(part => part.split(':')[1]) // Extraer solo valores
      .join(' - '); // Unir con guiones
  }
  
  return instrumentKey;
};

const ValidationReport = ({ validationData, onExport, sessionId, validationSessionId }) => {
  const [expandedSections, setExpandedSections] = useState(['summary']);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedVariable, setSelectedVariable] = useState(null);
  const [selectedInstrument, setSelectedInstrument] = useState(null);
  const [loadingExport, setLoadingExport] = useState(null); // Track which export button is loading

  const handleExport = async (exportType) => {
    setLoadingExport(exportType);
    try {
      await onExport(exportType);
    } finally {
      setLoadingExport(null);
    }
  };

  if (!validationData) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Reporte de Validación
        </Typography>
        <Alert severity="info">
          <Typography>Cargando resultados de validación...</Typography>
        </Alert>
      </Box>
    );
  }

  const summary = validationData.summary || {};
  const instrumentValidation = validationData.instrument_validation || {};
  const duplicateValidation = validationData.duplicate_validation || {};
  const metadataValidation = validationData.metadata_validation || {};
  const classificationValidation = validationData.classification_validation || {};
  const advancedValidation = validationData.advanced_validation || {};

  const getStatusColor = (isValid) => {
    return isValid ? 'success' : 'error';
  };

  const getStatusText = (isValid, section = '') => {
    if (isValid) return 'VÁLIDO';
    
    // Mensajes específicos por sección para mejor UX
    switch(section) {
      case 'metadata':
        return 'VALORES FALTANTES';
      case 'duplicates':
        return 'IDS PROBLEMÁTICOS';
      default:
        return 'ERRORES ENCONTRADOS';
    }
  };

  const getGeneralStatusText = (validationStatus) => {
    switch(validationStatus) {
      case 'success':
        return 'Sin problemas detectados';
      case 'warning':
        return 'Observaciones detectadas';
      case 'error':
        return 'Problemas detectados';
      default:
        return 'Revisión en progreso';
    }
  };

  const handleSectionToggle = (section) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Reporte de Validación
      </Typography>
      
      {/* Summary Section */}
      <Accordion 
        expanded={expandedSections.includes('summary')}
        onChange={() => handleSectionToggle('summary')}
        sx={{ mb: 2 }}
      >
        <AccordionSummary>
          <Typography variant="h6">📊 Resumen General</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="primary" gutterBottom>
                    {summary.total_items || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {summary.total_items === 1 ? 'Ítem en total' : 'Ítems en total'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="primary" gutterBottom>
                    {summary.total_instruments || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {summary.total_instruments === 1 ? 'Instrumento analizado' : 'Instrumentos analizados'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Chip 
                    label={getGeneralStatusText(summary.validation_status)} 
                    color={summary.validation_status === 'success' ? 'success' : summary.validation_status === 'warning' ? 'warning' : 'error'}
                    size="large"
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Estado General
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Instrument Validation */}
      <Accordion 
        expanded={expandedSections.includes('instruments')}
        onChange={() => handleSectionToggle('instruments')}
        sx={{ mb: 2 }}
      >
        <AccordionSummary>
          <Typography variant="h6">🎯 Validación - Identificador de instrumentos</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {instrumentValidation.instrument_summary && (
            <Box>
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="primary" gutterBottom>
                        {instrumentValidation.instrument_summary.total_instruments || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total de Instrumentos
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="primary" gutterBottom>
                        {instrumentValidation.instrument_summary.total_observations || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total de Observaciones
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {instrumentValidation.instruments_detail && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Instrumentos Identificados
                  </Typography>
                  {Object.entries(instrumentValidation.instruments_detail).map(([key, instrument]) => (
                    <Card key={key} variant="outlined" sx={{ mb: 2 }}>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="h6" color="primary">
                            {instrument.display_name}
                          </Typography>
                          <Chip 
                            label={`${instrument.observations_count} observaciones`}
                            color="primary" 
                            variant="outlined" 
                          />
                        </Box>
                        {instrument.instrument_variables && Object.keys(instrument.instrument_variables).length > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              Variables de identificación:
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {Object.entries(instrument.instrument_variables).map(([varName, value]) => (
                                <Chip key={varName} label={`${varName}: ${value}`} size="small" variant="outlined" />
                              ))}
                            </Box>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Duplicate Validation */}
      <Accordion 
        expanded={expandedSections.includes('duplicates')}
        onChange={() => handleSectionToggle('duplicates')}
        sx={{ mb: 2 }}
      >
        <AccordionSummary>
          <Typography variant="h6">🔍 Validación - Identificador de ítems</Typography>
          <Chip 
            label={getStatusText(duplicateValidation.is_valid, 'duplicates')} 
            color={getStatusColor(duplicateValidation.is_valid)}
            size="small"
            sx={{ ml: 2 }}
          />
        </AccordionSummary>
        <AccordionDetails>
          <IdVariablesAnalysis 
            duplicateValidation={duplicateValidation}
            instrumentsDetail={instrumentValidation.instruments_detail}
          />
        </AccordionDetails>
      </Accordion>

      {/* Metadata Validation */}
      <Accordion 
        expanded={expandedSections.includes('metadata')}
        onChange={() => handleSectionToggle('metadata')}
        sx={{ mb: 2 }}
      >
        <AccordionSummary>
          <Typography variant="h6">📋 Validación - Información crítica</Typography>
          <Chip 
            label={getStatusText(metadataValidation.is_valid, 'metadata')} 
            color={getStatusColor(metadataValidation.is_valid)}
            size="small"
            sx={{ ml: 2 }}
          />
        </AccordionSummary>
        <AccordionDetails>
          <CriticalVariablesAnalysis 
            metadataValidation={metadataValidation}
            instrumentsDetail={instrumentValidation.instruments_detail}
          />
        </AccordionDetails>
      </Accordion>

      {/* Classification Validation */}
      <Accordion 
        expanded={expandedSections.includes('classification')}
        onChange={() => handleSectionToggle('classification')}
        sx={{ mb: 2 }}
      >
        <AccordionSummary>
          <Typography variant="h6">🏷️ Validación - Información Complementaria</Typography>
          <Chip 
            label={classificationValidation.warnings && classificationValidation.warnings.length > 0 ? 'ADVERTENCIAS' : 'OK'} 
            color={classificationValidation.warnings && classificationValidation.warnings.length > 0 ? 'warning' : 'success'}
            size="small"
            sx={{ ml: 2 }}
          />
        </AccordionSummary>
        <AccordionDetails>
          {classificationValidation.unique_counts_per_instrument && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Valores Únicos por Instrumento - Haz clic para ver detalles
              </Typography>
              {Object.entries(classificationValidation.unique_counts_per_instrument).map(([instrument, variables]) => (
                <Box key={instrument} sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 'bold', 
                    color: 'primary.main', 
                    mb: 2,
                    pb: 1,
                    borderBottom: '2px solid',
                    borderColor: 'primary.light'
                  }}>
                    {getInstrumentDisplayName(instrument, instrumentValidation.instruments_detail)}
                  </Typography>
                  <Grid container spacing={2}>
                    {Object.entries(variables || {}).map(([variable, count]) => (
                      <Grid item xs={12} sm={6} md={4} key={variable}>
                        <Card 
                          variant="outlined" 
                          sx={{ 
                            cursor: 'pointer',
                            height: '100%',
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': { 
                              backgroundColor: 'rgba(25, 118, 210, 0.04)',
                              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.15)',
                              transform: 'translateY(-2px)'
                            }
                          }}
                          onClick={() => {
                            setSelectedVariable(variable);
                            setSelectedInstrument(instrument);
                            setModalOpen(true);
                          }}
                        >
                          <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
                            <Typography variant="h4" color="primary" gutterBottom sx={{ fontWeight: 'bold' }}>
                              {count}
                            </Typography>
                            <Typography variant="body1" gutterBottom sx={{ 
                              fontWeight: 500,
                              minHeight: '48px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {variable}
                            </Typography>
                            <Chip 
                              label="Ver detalles" 
                              size="small" 
                              variant="outlined" 
                              color="primary"
                              sx={{ mt: 1 }}
                            />
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              ))}
            </Box>
          )}
          
          {classificationValidation.statistics && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography>
                Completitud promedio: {classificationValidation.statistics.average_completeness || 0}%
                {classificationValidation.statistics.total_empty_cells && (
                  <span> • Celdas vacías: {classificationValidation.statistics.total_empty_cells}</span>
                )}
              </Typography>
            </Alert>
          )}
          
          {/* Validation Parameters */}
          {classificationValidation.validation_parameters && (
            <Box sx={{ mt: 2, p: 2, backgroundColor: '#f8f9fa', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                Parámetros de Validación:
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Variables de Clasificación:</strong> {classificationValidation.validation_parameters.classification_variables?.join(', ') || 'Ninguna'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Variables de Instrumento:</strong> {classificationValidation.validation_parameters.instrument_variables?.join(', ') || 'Ninguna'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Instrumentos Analizados:</strong> {classificationValidation.validation_parameters.total_instruments_analyzed || 0}
              </Typography>
              <Typography variant="body2">
                <strong>Total de Ítems:</strong> {classificationValidation.validation_parameters.total_items_analyzed || 0}
              </Typography>
            </Box>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Advanced Validation Options - Solo mostrar si hay constraints configurados */}
      {(advancedValidation?.validation_parameters?.has_item_count_constraints ||
        advancedValidation?.validation_parameters?.has_key_variable_constraints) && (
        <Accordion
          expanded={expandedSections.includes('advanced')}
          onChange={() => handleSectionToggle('advanced')}
          sx={{ mb: 2 }}
        >
          <AccordionSummary>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <Tune />
              <Typography variant="h6">Validación - Opciones Avanzadas</Typography>
              <Chip
                label={advancedValidation.is_valid ? 'VÁLIDO' : 'ERRORES ENCONTRADOS'}
                color={advancedValidation.is_valid ? 'success' : 'error'}
                size="small"
                sx={{ ml: 2 }}
              />
            </Box>
          </AccordionSummary>

          <AccordionDetails>
            {/* Tabla de errores de conteo de ítems */}
            {advancedValidation.item_count_errors && advancedValidation.item_count_errors.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  Errores de Conteo de Ítems
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'primary.main' }}>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Instrumento</TableCell>
                        <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>Esperado</TableCell>
                        <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>Encontrado</TableCell>
                        <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>Diferencia</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {advancedValidation.item_count_errors.map((v, idx) => (
                        <TableRow key={idx} sx={{ '&:nth-of-type(odd)': { backgroundColor: 'grey.50' } }}>
                          <TableCell>{getInstrumentDisplayName(v.context.instrument, instrumentValidation.instruments_detail)}</TableCell>
                          <TableCell align="right">{v.context.expected_count}</TableCell>
                          <TableCell align="right">{v.context.actual_count}</TableCell>
                          <TableCell align="right">
                            <Chip
                              label={v.context.difference > 0 ? `+${v.context.difference}` : v.context.difference}
                              color={v.context.difference === 0 ? 'success' : 'error'}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* Alerts de errores de variables de claves */}
            {advancedValidation.key_variable_errors && advancedValidation.key_variable_errors.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  Errores de Variables de Claves
                </Typography>
                {advancedValidation.key_variable_errors.map((v, idx) => (
                  <Alert severity="error" key={idx} sx={{ mb: 1 }}>
                    <AlertTitle>
                      <strong>{v.context.variable}</strong> en {getInstrumentDisplayName(v.context.instrument, instrumentValidation.instruments_detail)}
                    </AlertTitle>
                    <Typography variant="body2" sx={{ mb: 2 }}>{v.message}</Typography>

                    {/* Mostrar resumen de cardinalidad si aplica */}
                    {v.context.expected_count !== null && v.context.expected_count !== undefined && (
                      <Box sx={{ mb: 2, p: 1, backgroundColor: 'grey.100', borderRadius: 1 }}>
                        <Typography variant="body2">
                          Se esperaban {v.context.expected_count} valores únicos, se encontraron {v.context.actual_count}
                        </Typography>
                      </Box>
                    )}

                    {/* Mostrar valores esperados con estados */}
                    {v.context.expected_values && v.context.expected_values.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 1 }}>
                          Estado de valores esperados:
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {/* Valores que coinciden (verde) */}
                          {v.context.matched_values && v.context.matched_values.map(val => (
                            <Chip
                              key={`matched-${val}`}
                              label={val}
                              size="small"
                              sx={{
                                backgroundColor: 'success.light',
                                color: 'success.contrastText',
                                fontWeight: 'bold'
                              }}
                            />
                          ))}
                          {/* Valores faltantes (rojo) */}
                          {v.context.missing_values && v.context.missing_values.map(val => (
                            <Chip
                              key={`missing-${val}`}
                              label={val}
                              size="small"
                              sx={{
                                backgroundColor: 'error.light',
                                color: 'error.contrastText',
                                fontWeight: 'bold'
                              }}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}

                    {/* Valores inesperados (naranja) */}
                    {v.context.unexpected_values && v.context.unexpected_values.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 1 }}>
                          Valores inesperados encontrados:
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {v.context.unexpected_values.map(val => (
                            <Chip
                              key={`unexpected-${val}`}
                              label={val}
                              size="small"
                              sx={{
                                backgroundColor: 'warning.light',
                                color: 'warning.contrastText',
                                fontWeight: 'bold'
                              }}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Alert>
                ))}
              </Box>
            )}

            {/* Tabla de validaciones exitosas de conteo de ítems */}
            {advancedValidation.item_count_passed && advancedValidation.item_count_passed.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'success.main' }}>
                  Validaciones Exitosas de Conteo de Ítems
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'success.main' }}>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Instrumento</TableCell>
                        <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>Esperado</TableCell>
                        <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>Encontrado</TableCell>
                        <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>Estado</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {advancedValidation.item_count_passed.map((v, idx) => (
                        <TableRow key={idx} sx={{ '&:nth-of-type(odd)': { backgroundColor: 'success.50' } }}>
                          <TableCell>{v.instrument_display || getInstrumentDisplayName(v.instrument, instrumentValidation.instruments_detail)}</TableCell>
                          <TableCell align="right">{v.expected_count}</TableCell>
                          <TableCell align="right">{v.actual_count}</TableCell>
                          <TableCell align="center">
                            <Chip label="OK" color="success" size="small" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* Alerts de validaciones exitosas de variables de claves */}
            {advancedValidation.key_variable_passed && advancedValidation.key_variable_passed.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'success.main' }}>
                  Validaciones Exitosas de Variables de Claves
                </Typography>
                {advancedValidation.key_variable_passed.map((v, idx) => (
                  <Alert severity="success" key={idx} sx={{ mb: 1 }}>
                    <AlertTitle>
                      <strong>{v.variable}</strong> en {v.instrument_display || getInstrumentDisplayName(v.instrument, instrumentValidation.instruments_detail)}
                    </AlertTitle>
                    {v.expected_count && (
                      <Typography variant="body2">
                        Cardinalidad: se esperaban {v.expected_count} valores únicos, se encontraron {v.actual_count}
                      </Typography>
                    )}
                    {v.expected_values && v.expected_values.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption">Valores esperados:</Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                          {v.expected_values.map(val => (
                            <Chip key={val} label={val} size="small" color="success" variant="outlined" />
                          ))}
                        </Box>
                      </Box>
                    )}
                    {v.actual_values && v.actual_values.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption">Valores encontrados:</Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                          {v.actual_values.map(val => (
                            <Chip key={val} label={val} size="small" color="success" variant="filled" />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Alert>
                ))}
              </Box>
            )}

            {/* Mensaje de éxito general */}
            {advancedValidation.is_valid && (
              <Alert severity="success">
                Todas las opciones avanzadas de validación se cumplieron exitosamente
              </Alert>
            )}
          </AccordionDetails>
        </Accordion>
      )}

      {/* Export Options */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Opciones de Exportación
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <button
              onClick={() => handleExport('validation_excel')}
              disabled={loadingExport !== null}
              style={{
                width: '100%',
                padding: '12px 24px',
                backgroundColor: loadingExport === 'validation_excel' ? '#81c784' : '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loadingExport !== null ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                opacity: loadingExport !== null && loadingExport !== 'validation_excel' ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loadingExport === 'validation_excel' && <CircularProgress size={16} sx={{ color: 'white' }} />}
              {loadingExport === 'validation_excel' ? 'Generando...' : '📋 Reporte de Validación (Excel)'}
            </button>
            <Typography variant="caption" display="block" sx={{ mt: 1, textAlign: 'center' }}>
              Base original con errores marcados
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <button
              onClick={() => handleExport('validation_report_pdf')}
              disabled={loadingExport !== null}
              style={{
                width: '100%',
                padding: '12px 24px',
                backgroundColor: loadingExport === 'validation_report_pdf' ? '#e57373' : '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loadingExport !== null ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                opacity: loadingExport !== null && loadingExport !== 'validation_report_pdf' ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loadingExport === 'validation_report_pdf' && <CircularProgress size={16} sx={{ color: 'white' }} />}
              {loadingExport === 'validation_report_pdf' ? 'Generando...' : '📄 Reporte de Validación (PDF)'}
            </button>
            <Typography variant="caption" display="block" sx={{ mt: 1, textAlign: 'center' }}>
              Reporte imprimible
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <button
              onClick={() => handleExport('normalized_xlsx')}
              disabled={loadingExport !== null}
              style={{
                width: '100%',
                padding: '12px 24px',
                backgroundColor: loadingExport === 'normalized_xlsx' ? '#66bb6a' : '#388e3c',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loadingExport !== null ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                opacity: loadingExport !== null && loadingExport !== 'normalized_xlsx' ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loadingExport === 'normalized_xlsx' && <CircularProgress size={16} sx={{ color: 'white' }} />}
              {loadingExport === 'normalized_xlsx' ? 'Generando...' : '📊 Datos Normalizados (Excel)'}
            </button>
            <Typography variant="caption" display="block" sx={{ mt: 1, textAlign: 'center' }}>
              Base con nombres estandarizados
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Classification Values Modal */}
      {modalOpen && selectedInstrument && selectedVariable && (
        <ClassificationValuesModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          variable={selectedVariable}
          instrument={selectedInstrument}
          instrumentsDetail={instrumentValidation.instruments_detail}
          sessionId={sessionId}
          validationSessionId={validationSessionId}
        />
      )}
    </Box>
  );
};

export default ValidationReport;