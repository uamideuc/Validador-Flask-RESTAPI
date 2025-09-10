import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Alert, 
  Card, 
  CardContent, 
  Button, 
  Collapse, 
  Chip,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { 
  ExpandMore as ExpandMoreIcon, 
  Visibility as VisibilityIcon, 
  VisibilityOff as VisibilityOffIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

// Tipos
interface RepeatedDetail {
  value: string;
  count: number;
  times_repeated: number;
}

interface VariableAnalysis {
  total_observations: number;
  unique_values_count: number;
  duplicated_values_count: number;
  total_duplicated_items: number;
  missing_count: number;
  missing_percentage: number;
  repeated_details: RepeatedDetail[];
}

interface InstrumentAnalysis {
  total_observations: number;
  variables_analysis: { [variable: string]: VariableAnalysis };
}

interface InstrumentsAnalysis {
  [instrumentKey: string]: InstrumentAnalysis;
}

interface DuplicateValidation {
  statistics?: {
    instruments_analysis?: InstrumentsAnalysis;
    total_duplicated_items?: number;
    total_missing_values?: number;
    total_observations_analyzed?: number;
  };
}

interface InstrumentDetail {
  display_name: string;
  observations_count: number;
  instrument_variables: { [key: string]: string };
}

interface InstrumentsDetail {
  [instrumentKey: string]: InstrumentDetail;
}

interface Props {
  duplicateValidation: DuplicateValidation;
  instrumentsDetail: InstrumentsDetail;
}

// Helper para mostrar nombres de instrumentos amigables al usuario
const getInstrumentDisplayName = (instrumentKey: string, instrumentsDetail: InstrumentsDetail = {}): string => {
  if (instrumentKey === 'default_instrument') {
    return 'Toda la base de datos';
  }
  
  const instrumentDetail = instrumentsDetail[instrumentKey];
  if (instrumentDetail && instrumentDetail.display_name) {
    return instrumentDetail.display_name;
  }
  
  if (instrumentKey.includes('|')) {
    return instrumentKey
      .split('|')
      .map(part => part.split(':')[1])
      .join(' - ');
  }
  
  return instrumentKey;
};

const IdVariablesAnalysis: React.FC<Props> = ({ duplicateValidation, instrumentsDetail }) => {
  const [expandedView, setExpandedView] = useState<boolean>(true);
  const [expandedInstruments, setExpandedInstruments] = useState<Set<string>>(new Set());
  const [selectedVariable, setSelectedVariable] = useState<{variable: string, instrument: string, data: VariableAnalysis} | null>(null);

  const instrumentsAnalysis = duplicateValidation.statistics?.instruments_analysis || {};

  useEffect(() => {
    if (expandedView && Object.keys(instrumentsAnalysis).length > 0) {
      setExpandedInstruments(new Set(Object.keys(instrumentsAnalysis)));
    } else if (!expandedView) {
      setExpandedInstruments(new Set());
    }
  }, [expandedView, instrumentsAnalysis]);

  const toggleInstrument = (instrumentKey: string): void => {
    const newExpanded = new Set(expandedInstruments);
    if (newExpanded.has(instrumentKey)) {
      newExpanded.delete(instrumentKey);
    } else {
      newExpanded.add(instrumentKey);
    }
    setExpandedInstruments(newExpanded);
  };

  const getVariableStatusIcon = (varData: VariableAnalysis) => {
    if (varData.missing_count > 0 || varData.total_duplicated_items > 0) {
      return <ErrorIcon color="error" fontSize="small" />;
    }
    return <CheckCircleIcon color="success" fontSize="small" />;
  };

  const formatVariableStatus = (varData: VariableAnalysis) => {
    const parts = [`${varData.unique_values_count} únicos`];
    
    if (varData.total_duplicated_items > 0) {
      parts.push(`${varData.total_duplicated_items} repetidos`);
    }
    
    if (varData.missing_count > 0) {
      parts.push(`${varData.missing_count} ${varData.missing_count === 1 ? 'faltante' : 'faltantes'}`);
    }

    if (varData.total_duplicated_items === 0 && varData.missing_count === 0) {
      parts.push('✓');
    }
    
    return parts.join(' • ');
  };

  if (!instrumentsAnalysis || Object.keys(instrumentsAnalysis).length === 0) {
    return (
      <Alert severity="info">
        No hay datos de identificadores de ítems para mostrar.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Control de expansión */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
          Análisis de Identificadores de Ítems por Instrumento
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={expandedView ? <VisibilityOffIcon /> : <VisibilityIcon />}
          onClick={() => setExpandedView(!expandedView)}
          sx={{ 
            borderRadius: 2,
            textTransform: 'none',
            transition: 'all 0.2s ease-in-out'
          }}
        >
          {expandedView ? 'Vista compacta' : 'Expandir análisis'}
        </Button>
      </Box>

      {/* Resumen general */}
      {duplicateValidation.statistics && (
        <Alert 
          severity={
            (duplicateValidation.statistics.total_duplicated_items || 0) > 0 || 
            (duplicateValidation.statistics.total_missing_values || 0) > 0 ? 'error' : 'success'
          } 
          sx={{ mb: 3 }}
        >
          <Typography variant="body2">
            {(duplicateValidation.statistics.total_duplicated_items || 0) > 0 && (
              <span><strong>{duplicateValidation.statistics.total_duplicated_items} ítems repetidos</strong></span>
            )}
            {(duplicateValidation.statistics.total_duplicated_items || 0) > 0 && 
             (duplicateValidation.statistics.total_missing_values || 0) > 0 && ' • '}
            {(duplicateValidation.statistics.total_missing_values || 0) > 0 && (
              <span><strong>{duplicateValidation.statistics.total_missing_values} valores faltantes</strong></span>
            )}
            {(duplicateValidation.statistics.total_duplicated_items || 0) === 0 && 
             (duplicateValidation.statistics.total_missing_values || 0) === 0 && (
              <span><strong>Todos los identificadores son únicos y están completos</strong></span>
            )}
            <span> de {duplicateValidation.statistics.total_observations_analyzed || 0} observaciones totales</span>
          </Typography>
        </Alert>
      )}

      {/* Análisis por instrumento */}
      {Object.entries(instrumentsAnalysis).map(([instrumentKey, analysis]) => {
        const isExpanded = expandedInstruments.has(instrumentKey);
        const displayName = getInstrumentDisplayName(instrumentKey, instrumentsDetail);

        return (
          <Box key={instrumentKey}>
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent sx={{ pb: isExpanded ? 2 : 1 }}>
                {/* Header del instrumento */}
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    cursor: expandedView ? 'default' : 'pointer',
                    pb: isExpanded ? 2 : 0
                  }}
                  onClick={!expandedView ? () => toggleInstrument(instrumentKey) : undefined}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {!expandedView && (
                      <ExpandMoreIcon 
                        sx={{ 
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease-in-out'
                        }}
                      />
                    )}
                    <Typography variant="h6" sx={{ 
                      fontWeight: 'bold', 
                      color: 'primary.main'
                    }}>
                      🔍 {displayName}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {(() => {
                      // Calcular totales para este instrumento
                      const totalDuplicated = Object.values(analysis.variables_analysis || {})
                        .reduce((sum, varData) => sum + (varData.total_duplicated_items || 0), 0);
                      const totalMissing = Object.values(analysis.variables_analysis || {})
                        .reduce((sum, varData) => sum + (varData.missing_count || 0), 0);
                      
                      return (
                        <>
                          {totalDuplicated > 0 && (
                            <Typography variant="body2" color="error.main" sx={{ 
                              fontSize: '0.875rem',
                              fontWeight: 500 
                            }}>
                              {totalDuplicated} {totalDuplicated === 1 ? 'repetido' : 'repetidos'} •
                            </Typography>
                          )}
                          {totalMissing > 0 && (
                            <Typography variant="body2" color="warning.main" sx={{ 
                              fontSize: '0.875rem',
                              fontWeight: 500 
                            }}>
                              {totalMissing} {totalMissing === 1 ? 'faltante' : 'faltantes'} •
                            </Typography>
                          )}
                        </>
                      );
                    })()}
                    <Chip 
                      label={`${analysis.total_observations} ${analysis.total_observations === 1 ? 'observación' : 'observaciones'}`}
                      variant="outlined"
                      size="small"
                    />
                  </Box>
                </Box>

                {/* Análisis de variables */}
                <Collapse in={isExpanded} timeout={300}>
                  <Box sx={{ mt: 2 }}>
                    {Object.entries(analysis.variables_analysis || {}).map(([variable, varData]) => (
                      <Box key={variable} sx={{ mb: 2, p: 2, backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
                        {/* Header de variable con status */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getVariableStatusIcon(varData)}
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                              {variable}
                            </Typography>
                          </Box>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setSelectedVariable({variable, instrument: instrumentKey, data: varData})}
                            sx={{ textTransform: 'none' }}
                          >
                            Ver detalles
                          </Button>
                        </Box>

                        {/* Status resumido */}
                        <Typography variant="body2" color="text.secondary">
                          {formatVariableStatus(varData)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Collapse>
              </CardContent>
            </Card>

            {/* Modal de detalles - ahora aparece justo debajo del card correspondiente */}
            {selectedVariable && selectedVariable.instrument === instrumentKey && (
              <Card sx={{ mb: 3, border: '2px solid', borderColor: 'primary.light' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      Detalles: {selectedVariable.variable}
                    </Typography>
                    <Button onClick={() => setSelectedVariable(null)} variant="outlined" size="small">
                      Cerrar
                    </Button>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Instrumento: {getInstrumentDisplayName(selectedVariable.instrument, instrumentsDetail)}
                  </Typography>

                  {/* Estadísticas */}
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={6} md={3}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h4" color="primary">{selectedVariable.data.unique_values_count}</Typography>
                        <Typography variant="body2">Valores únicos</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h4" color="error">{selectedVariable.data.total_duplicated_items}</Typography>
                        <Typography variant="body2">Ítems repetidos</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h4" color="warning">{selectedVariable.data.missing_count}</Typography>
                        <Typography variant="body2">{selectedVariable.data.missing_count === 1 ? 'Valor faltante' : 'Valores faltantes'}</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h4">{selectedVariable.data.total_observations}</Typography>
                        <Typography variant="body2">Total observaciones</Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  {/* Tabla de valores repetidos */}
                  {selectedVariable.data.repeated_details && selectedVariable.data.repeated_details.length > 0 && (
                    <Box>
                      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                        Valores que se repiten
                      </Typography>
                      <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                        <Table stickyHeader size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Valor</TableCell>
                              <TableCell align="center">Apariciones</TableCell>
                              <TableCell align="center">Repeticiones</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {selectedVariable.data.repeated_details.map((detail, index) => (
                              <TableRow key={index}>
                                <TableCell>{detail.value}</TableCell>
                                <TableCell align="center">{detail.count}</TableCell>
                                <TableCell align="center">
                                  <Chip 
                                    label={`+${detail.times_repeated}`} 
                                    color="error" 
                                    size="small" 
                                    variant="outlined" 
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}
          </Box>
        );
      })}

    </Box>
  );
};

export default IdVariablesAnalysis;