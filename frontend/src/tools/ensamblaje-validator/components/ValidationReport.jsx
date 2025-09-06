import React, { useState } from 'react';
import { Box, Typography, Paper, Alert, Accordion, AccordionSummary, AccordionDetails, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Grid, Card, CardContent } from '@mui/material';
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

      {/* Export Options */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Opciones de Exportación
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <button 
              onClick={() => onExport('normalized_xlsx')}
              style={{
                width: '100%',
                padding: '12px 24px',
                backgroundColor: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              📊 Datos Normalizados (Excel)
            </button>
            <Typography variant="caption" display="block" sx={{ mt: 1, textAlign: 'center' }}>
              Base con nombres estandarizados
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <button 
              onClick={() => onExport('validation_excel')}
              style={{
                width: '100%',
                padding: '12px 24px',
                backgroundColor: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              📋 Reporte de Validación (Excel)
            </button>
            <Typography variant="caption" display="block" sx={{ mt: 1, textAlign: 'center' }}>
              Base original con errores marcados
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <button 
              onClick={() => onExport('validation_report_pdf')}
              style={{
                width: '100%',
                padding: '12px 24px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              📄 Reporte de Validación (PDF)
            </button>
            <Typography variant="caption" display="block" sx={{ mt: 1, textAlign: 'center' }}>
              Reporte profesional imprimible
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