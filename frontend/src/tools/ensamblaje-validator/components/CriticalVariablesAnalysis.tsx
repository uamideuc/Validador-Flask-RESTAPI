import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  Alert, 
  Card, 
  CardContent, 
  Button, 
  Collapse, 
  LinearProgress, 
  Chip 
} from '@mui/material';
import { 
  ExpandMore as ExpandMoreIcon, 
  Visibility as VisibilityIcon, 
  VisibilityOff as VisibilityOffIcon 
} from '@mui/icons-material';

// Tipos
interface VariableDistribution {
  value: string;
  count: number;
  percentage: number;
}

interface VariableAnalysis {
  total_observations: number;
  unique_values_count: number;
  missing_count: number;
  missing_percentage: number;
  distribution: VariableDistribution[];
}

interface InstrumentAnalysis {
  total_observations: number;
  variables_analysis: { [variable: string]: VariableAnalysis };
}

interface InstrumentsAnalysis {
  [instrumentKey: string]: InstrumentAnalysis;
}

interface MetadataValidation {
  statistics?: {
    instruments_analysis?: InstrumentsAnalysis;
    total_missing_values?: number;
    total_observations_analyzed?: number;
    missing_percentage_overall?: number;
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
  metadataValidation: MetadataValidation;
  instrumentsDetail: InstrumentsDetail;
}

// Helper para mostrar nombres de instrumentos amigables al usuario
const getInstrumentDisplayName = (instrumentKey: string, instrumentsDetail: InstrumentsDetail = {}): string => {
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

const CriticalVariablesAnalysis: React.FC<Props> = ({ metadataValidation, instrumentsDetail }) => {
  const [expandedView, setExpandedView] = useState<boolean>(true); // Primera apertura = expandido
  const [expandedInstruments, setExpandedInstruments] = useState<Set<string>>(new Set());

  const instrumentsAnalysis = useMemo(() => {
    return metadataValidation.statistics?.instruments_analysis || {};
  }, [metadataValidation.statistics?.instruments_analysis]);

  // En primera carga, expandir todos los instrumentos
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

  if (!instrumentsAnalysis || Object.keys(instrumentsAnalysis).length === 0) {
    return (
      <Alert severity="info">
        No hay datos de variables críticas para mostrar.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Control de expansión */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
          Análisis de Variables Críticas por Instrumento
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
      {metadataValidation.statistics && (
        <Alert 
          severity={metadataValidation.statistics.total_missing_values && metadataValidation.statistics.total_missing_values > 0 ? 'warning' : 'success'} 
          sx={{ mb: 3 }}
        >
          <Typography variant="body2">
            <strong>{metadataValidation.statistics.total_missing_values || 0} valores faltantes</strong> de {metadataValidation.statistics.total_observations_analyzed || 0} observaciones totales
            {metadataValidation.statistics.missing_percentage_overall && metadataValidation.statistics.missing_percentage_overall > 0 && (
              <span> ({metadataValidation.statistics.missing_percentage_overall}%)</span>
            )}
          </Typography>
        </Alert>
      )}

      {/* Análisis por instrumento */}
      {Object.entries(instrumentsAnalysis).map(([instrumentKey, analysis]) => {
        const isExpanded = expandedInstruments.has(instrumentKey);
        const displayName = getInstrumentDisplayName(instrumentKey, instrumentsDetail);

        return (
          <Card key={instrumentKey} variant="outlined" sx={{ mb: 2 }}>
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
                    📋 {displayName}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {(() => {
                    // Calcular total de valores faltantes para este instrumento
                    const totalMissing = Object.values(analysis.variables_analysis || {})
                      .reduce((sum, varData) => sum + (varData.missing_count || 0), 0);
                    
                    return totalMissing > 0 && (
                      <Typography variant="body2" color="warning.main" sx={{ 
                        fontSize: '0.875rem',
                        fontWeight: 500 
                      }}>
                        {totalMissing} {totalMissing === 1 ? 'faltante' : 'faltantes'} •
                      </Typography>
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
                    <Box key={variable} sx={{ mb: 3, p: 2, backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
                      {/* Header de variable */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                          {variable}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Chip 
                            label={`${varData.unique_values_count} ${varData.unique_values_count === 1 ? 'valor' : 'valores'}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                          {varData.missing_count > 0 && (
                            <Chip 
                              label={`${varData.missing_count} ${varData.missing_count === 1 ? 'faltante' : 'faltantes'}`}
                              size="small"
                              color="warning"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </Box>

                      {/* Distribución de valores con barras */}
                      <Box>
                        {varData.distribution.map((item, index) => (
                          <Box key={index} sx={{ mb: 1.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                "{item.value}"
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {item.count} obs ({item.percentage}%)
                              </Typography>
                            </Box>
                            <LinearProgress 
                              variant="determinate" 
                              value={item.percentage} 
                              sx={{ 
                                height: 6, 
                                borderRadius: 3,
                                backgroundColor: 'rgba(0,0,0,0.08)',
                                '& .MuiLinearProgress-bar': {
                                  borderRadius: 3,
                                  backgroundColor: 'primary.main'
                                }
                              }}
                            />
                          </Box>
                        ))}
                        
                        {/* Valores faltantes */}
                        {varData.missing_count > 0 && (
                          <Box sx={{ mt: 2, p: 1, backgroundColor: 'rgba(255,193,7,0.1)', borderRadius: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                              <Typography variant="body2" sx={{ fontWeight: 500, color: 'warning.main' }}>
                                {varData.missing_count === 1 ? 'Valor faltante' : 'Valores faltantes'}
                              </Typography>
                              <Typography variant="body2" color="warning.main">
                                {varData.missing_count} obs ({varData.missing_percentage}%)
                              </Typography>
                            </Box>
                            <LinearProgress 
                              variant="determinate" 
                              value={varData.missing_percentage} 
                              sx={{ 
                                height: 4, 
                                borderRadius: 2,
                                backgroundColor: 'rgba(255,193,7,0.2)',
                                '& .MuiLinearProgress-bar': {
                                  borderRadius: 2,
                                  backgroundColor: 'warning.main'
                                }
                              }}
                            />
                          </Box>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Collapse>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
};

export default CriticalVariablesAnalysis;