import React, { useState } from 'react';
import { Box, Typography, Paper, Alert, Accordion, AccordionSummary, AccordionDetails, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Grid, Card, CardContent } from '@mui/material';
import ClassificationValuesModal from './ClassificationValuesModal';

const ValidationReport = ({ validationData, onExport, sessionId }) => {
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
  const duplicateValidation = validationData.duplicate_validation || {};
  const metadataValidation = validationData.metadata_validation || {};
  const classificationValidation = validationData.classification_validation || {};

  const getStatusColor = (isValid) => {
    return isValid ? 'success' : 'error';
  };

  const getStatusText = (isValid) => {
    return isValid ? 'VÁLIDO' : 'ERRORES ENCONTRADOS';
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
                    Total de Ítems
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
                    Instrumentos Analizados
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Chip 
                    label={summary.validation_status || 'desconocido'} 
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

      {/* Duplicate Validation */}
      <Accordion 
        expanded={expandedSections.includes('duplicates')}
        onChange={() => handleSectionToggle('duplicates')}
        sx={{ mb: 2 }}
      >
        <AccordionSummary>
          <Typography variant="h6">🔍 Validación de Duplicados</Typography>
          <Chip 
            label={getStatusText(duplicateValidation.is_valid)} 
            color={getStatusColor(duplicateValidation.is_valid)}
            size="small"
            sx={{ ml: 2 }}
          />
        </AccordionSummary>
        <AccordionDetails>
          {duplicateValidation.duplicate_items && duplicateValidation.duplicate_items.length > 0 ? (
            <Box>
              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Se encontraron {duplicateValidation.duplicate_items.length} ítems duplicados
                </Typography>
              </Alert>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID del Ítem</TableCell>
                      <TableCell>Instrumento</TableCell>
                      <TableCell>Filas Afectadas</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {duplicateValidation.duplicate_items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.item_id}</TableCell>
                        <TableCell>
                          {Object.entries(item.instrument_combination || {}).map(([key, value]) => (
                            <Chip key={key} label={`${key}: ${value}`} size="small" sx={{ mr: 0.5 }} />
                          ))}
                        </TableCell>
                        <TableCell>{(item.row_indices || []).join(', ')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : (
            <Alert severity="success">
              <Typography>✓ No se encontraron ítems duplicados</Typography>
            </Alert>
          )}
          
          {/* Validation Parameters */}
          {duplicateValidation.validation_parameters && (
            <Box sx={{ mt: 2, p: 2, backgroundColor: '#f8f9fa', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                Parámetros de Validación:
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Variables de ID:</strong> {duplicateValidation.validation_parameters.item_id_variables?.join(', ') || 'Ninguna'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Variables de Instrumento:</strong> {duplicateValidation.validation_parameters.instrument_variables?.join(', ') || 'Ninguna'}
              </Typography>
              <Typography variant="body2">
                <strong>Instrumentos Analizados:</strong> {duplicateValidation.validation_parameters.total_instruments_analyzed || 0}
              </Typography>
            </Box>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Metadata Validation */}
      <Accordion 
        expanded={expandedSections.includes('metadata')}
        onChange={() => handleSectionToggle('metadata')}
        sx={{ mb: 2 }}
      >
        <AccordionSummary>
          <Typography variant="h6">📋 Validación de Metadata</Typography>
          <Chip 
            label={getStatusText(metadataValidation.is_valid)} 
            color={getStatusColor(metadataValidation.is_valid)}
            size="small"
            sx={{ ml: 2 }}
          />
        </AccordionSummary>
        <AccordionDetails>
          {metadataValidation.completeness_stats && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Completitud por Variable de Metadata
              </Typography>
              {Object.entries(metadataValidation.completeness_stats).map(([variable, percentage]) => (
                <Box key={variable} sx={{ mb: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">{variable}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {percentage}%
                    </Typography>
                  </Box>
                  <Box sx={{ width: '100%', height: 8, backgroundColor: '#e0e0e0', borderRadius: 4, mt: 1 }}>
                    <Box
                      sx={{
                        width: `${percentage}%`,
                        height: '100%',
                        backgroundColor: percentage === 100 ? '#4caf50' : '#ff9800',
                        borderRadius: 4,
                      }}
                    />
                  </Box>
                </Box>
              ))}
              
              {metadataValidation.unique_values_summary && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Valores Únicos por Variable
                  </Typography>
                  {Object.entries(metadataValidation.unique_values_summary).map(([variable, values]) => (
                    <Box key={variable} sx={{ mb: 2 }}>
                      <Typography variant="body2" fontWeight="bold">{variable}:</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                        {(values || []).slice(0, 10).map((value, index) => (
                          <Chip key={index} label={value} size="small" variant="outlined" />
                        ))}
                        {(values || []).length > 10 && (
                          <Chip label={`+${values.length - 10} más`} size="small" color="primary" />
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )}
          
          {metadataValidation.statistics && (
            <Alert severity={metadataValidation.is_valid ? 'success' : 'warning'} sx={{ mt: 2 }}>
              <Typography>
                Completitud promedio: {metadataValidation.statistics.average_completeness || 0}%
              </Typography>
            </Alert>
          )}
          
          {/* Validation Parameters */}
          {metadataValidation.validation_parameters && (
            <Box sx={{ mt: 2, p: 2, backgroundColor: '#f8f9fa', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                Parámetros de Validación:
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Variables de Metadata:</strong> {metadataValidation.validation_parameters.metadata_variables?.join(', ') || 'Ninguna'}
              </Typography>
              <Typography variant="body2">
                <strong>Total de Ítems:</strong> {metadataValidation.validation_parameters.total_items_analyzed || 0}
              </Typography>
            </Box>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Classification Validation */}
      <Accordion 
        expanded={expandedSections.includes('classification')}
        onChange={() => handleSectionToggle('classification')}
        sx={{ mb: 2 }}
      >
        <AccordionSummary>
          <Typography variant="h6">🏷️ Análisis de Variables de Clasificación</Typography>
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
                Valores Únicos por Instrumento
              </Typography>
              {Object.entries(classificationValidation.unique_counts_per_instrument).map(([instrument, variables]) => (
                <Box key={instrument} sx={{ mb: 3 }}>
                  <Typography variant="body1" fontWeight="bold" gutterBottom>
                    {instrument}
                  </Typography>
                  <Grid container spacing={2}>
                    {Object.entries(variables || {}).map(([variable, count]) => (
                      <Grid item xs={6} md={4} key={variable}>
                        <Card variant="outlined">
                          <CardContent sx={{ p: 2 }}>
                            <Typography variant="h6" color="primary">
                              {count}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {variable}
                            </Typography>
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

      {/* Classification Values Detail */}
      <Accordion 
        expanded={expandedSections.includes('classification-values')}
        onChange={() => handleSectionToggle('classification-values')}
        sx={{ mb: 2 }}
      >
        <AccordionSummary>
          <Typography variant="h6">📈 Detalle de Valores de Clasificación</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {classificationValidation.unique_counts_per_instrument && (
            <Box>
              {Object.entries(classificationValidation.unique_counts_per_instrument).map(([instrument, variables]) => (
                <Box key={instrument} sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    {instrument}
                  </Typography>
                  <Grid container spacing={2}>
                    {Object.entries(variables || {}).map(([variable, count]) => (
                      <Grid item xs={12} sm={6} md={4} key={variable}>
                        <Card 
                          variant="outlined" 
                          sx={{ 
                            cursor: 'pointer',
                            '&:hover': { backgroundColor: '#f5f5f5' }
                          }}
                          onClick={() => {
                            setSelectedVariable(variable);
                            setSelectedInstrument(instrument);
                            setModalOpen(true);
                          }}
                        >
                          <CardContent sx={{ p: 2 }}>
                            <Typography variant="h6" color="primary" gutterBottom>
                              {count}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {variable}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              valores únicos
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              ))}
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
                backgroundColor: '#1976d2',
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
                backgroundColor: '#ff9800',
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
              onClick={() => onExport('validation_pdf')}
              style={{
                width: '100%',
                padding: '12px 24px',
                backgroundColor: '#2e7d32',
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
      <ClassificationValuesModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        variable={selectedVariable}
        instrument={selectedInstrument}
        sessionId={sessionId}
      />
    </Box>
  );
};

export default ValidationReport;