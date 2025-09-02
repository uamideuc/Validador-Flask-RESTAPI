import React, { useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Stepper, 
  Step, 
  StepLabel, 
  Button, 
  CircularProgress,
  Alert,
  Chip,
  Badge
} from '@mui/material';
import { useAuth } from '../../core/auth';
import { useEnsamblajeState } from '../../core/ToolStateContext';
import FileUpload from './components/FileUpload';
import DataPreview from './components/DataPreview';
import VariableCategorization from './components/VariableCategorization';
import ValidationReport from './components/ValidationReport.jsx';

const steps = [
  'Subir Archivo',
  'Categorizar Variables',
  'Validar y Reportar'
];

interface EnsamblajeValidatorProps {
  sessionId?: string;
}

/**
 * Orquestador de UI y estado para la herramienta de validación de ensamblaje
 * Componente autocontenido que maneja todo el flujo de la herramienta
 * Utiliza ToolStateContext para preservar estado entre navegaciones
 */
const EnsamblajeValidator: React.FC<EnsamblajeValidatorProps> = ({ sessionId }) => {
  const { isAuthenticated, sessionId: authSessionId } = useAuth();
  const { ensamblajeState, setEnsamblajeState, resetEnsamblajeState } = useEnsamblajeState();

  // Extraer estado del context
  const {
    activeStep,
    uploadId,
    parseData,
    validationResults,
    validationSessionId,
    savedCategorization,
    hasCompletedValidation,
    hasChangesAfterValidation,
    error,
    isLoading
  } = ensamblajeState;

  const currentSessionId = sessionId || authSessionId;

  useEffect(() => {
    if (!isAuthenticated) {
      setEnsamblajeState({ error: 'Debe estar autenticado para usar esta herramienta' });
    }
  }, [isAuthenticated, setEnsamblajeState]);

  const handleNext = () => {
    setEnsamblajeState({ activeStep: activeStep + 1 });
  };

  const handleBack = () => {
    setEnsamblajeState({ 
      activeStep: activeStep - 1,
      error: '' // Limpiar error al retroceder
    });
  };

  const handleFileUploaded = (data: any) => {
    setEnsamblajeState({ 
      uploadId: data.upload_id,
      error: ''
    });
  };

  const handleFileParsed = (data: any) => {
    setEnsamblajeState({
      parseData: data,
      error: '',
      activeStep: activeStep + 1
    });
  };

  const handleCategorizationComplete = async (categorizationData: any) => {
    setEnsamblajeState({ isLoading: true, error: '' });
    
    try {
      // Import ApiService with new ToolKit methods
      const { default: ApiService } = await import('../../core/api');
      
      console.log('Categorization received:', categorizationData);
      console.log('Upload ID:', uploadId);
      
      // 🚨 CRÍTICO: Validar integridad de datos antes de requests
      if (!uploadId) {
        throw new Error('Upload ID not available');
      }
      
      if (!ensamblajeState.lastSessionId) {
        throw new Error('Sesión no válida. Por favor, recarga la aplicación.');
      }
      
      const saveResult = await ApiService.saveCategorization(uploadId, categorizationData);
      console.log('Save categorization result:', saveResult);
      
      if (!saveResult.success) {
        throw new Error(saveResult.message || 'Error saving categorization');
      }
      
      // GUARDAR categorización para persistencia (SOLO categorías reales, NO other_vars)
      const categorizationForPersistence = {
        instrument_vars: categorizationData.instrument_vars,
        item_id_vars: categorizationData.item_id_vars,
        metadata_vars: categorizationData.metadata_vars,
        classification_vars: categorizationData.classification_vars,
        // NO persistir other_vars - deben quedar como uncategorized para reasignación
      };
      
      // Now use the validation_session_id for ToolKit validation
      const validationResult = await ApiService.runToolValidation('ensamblaje', saveResult.validation_session_id);
      console.log('Validation result:', validationResult);
      
      if (validationResult.success) {
        setEnsamblajeState({
          validationResults: validationResult,
          validationSessionId: saveResult.validation_session_id,
          savedCategorization: categorizationForPersistence,
          hasCompletedValidation: true,
          activeStep: activeStep + 1,
          isLoading: false
        });
      } else {
        setEnsamblajeState({ 
          error: validationResult.error || 'Error en validación',
          isLoading: false
        });
      }
    } catch (error: any) {
      console.error('Error in categorization flow:', error);
      setEnsamblajeState({ 
        error: error.message || 'Error ejecutando validación con ToolKit',
        isLoading: false
      });
    }
  };

  const handleExport = async (exportType: string) => {
    if (!validationSessionId) {
      setEnsamblajeState({ error: 'No hay sesión de validación disponible para exportar' });
      return;
    }
    
    // 🚨 CRÍTICO: Validar sesión antes de export
    if (!ensamblajeState.lastSessionId) {
      setEnsamblajeState({ error: 'Sesión no válida. Por favor, recarga la aplicación.' });
      return;
    }
    
    setEnsamblajeState({ isLoading: true, error: '' });
    
    try {
      console.log('Export requested:', exportType);
      console.log('Using validation session ID:', validationSessionId);
      
      // Import ApiService with ToolKit export methods
      const { default: ApiService } = await import('../../core/api');
      
      // Use ToolKit export endpoint
      const exportResult = await ApiService.exportToolData('ensamblaje', validationSessionId, exportType);
      console.log('Export result:', exportResult);
      
      if (exportResult.success && exportResult.export_id) {
        // Download the generated file
        await ApiService.downloadExport(exportResult.export_id);
        setEnsamblajeState({ isLoading: false });
      } else {
        setEnsamblajeState({ 
          error: exportResult.error || 'Error generando archivo de exportación',
          isLoading: false
        });
      }
    } catch (error: any) {
      console.error('Error in export flow:', error);
      setEnsamblajeState({ 
        error: error.message || 'Error ejecutando exportación',
        isLoading: false
      });
    }
  };

  const handleReset = () => {
    resetEnsamblajeState();
  };

  if (!isAuthenticated) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Debe iniciar sesión para acceder al Validador de Instrumentos de Ensamblaje
        </Alert>
      </Box>
    );
  }

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <FileUpload
            onFileUploaded={handleFileUploaded}
            onFileParsed={handleFileParsed}
          />
        );
      case 1:
        return parseData ? (
          <VariableCategorization
            variables={parseData.variables}
            sampleValues={parseData.sample_values}
            onCategorization={handleCategorizationComplete}
            uploadId={uploadId!}
            sheetName={parseData.sheet_name}
            savedCategorization={savedCategorization}
          />
        ) : null;
      case 2:
        return validationResults ? (
          <ValidationReport
            validationData={validationResults.validation_report}
            onExport={handleExport}
            sessionId={currentSessionId}
            validationSessionId={validationSessionId}
          />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="h4" component="h1">
            Validador de Instrumentos de Ensamblaje
          </Typography>
          {hasChangesAfterValidation && (
            <Chip 
              label="Cambios sin guardar" 
              color="warning" 
              variant="outlined" 
              size="small"
              sx={{ fontWeight: 500 }}
            />
          )}
        </Box>
        <Typography variant="body1" color="text.secondary" paragraph>
          Herramienta especializada para validación de instrumentos educativos de tipo ensamblaje
        </Typography>
      </Paper>

      <Paper elevation={1} sx={{ p: 3 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {label}
                  {/* Mostrar indicador en paso de categorización si hay cambios */}
                  {index === 1 && hasChangesAfterValidation && (
                    <Chip 
                      label="●" 
                      color="warning" 
                      size="small"
                      sx={{ 
                        minWidth: '20px', 
                        height: '16px',
                        '& .MuiChip-label': { 
                          paddingX: 0.5,
                          fontSize: '0.7rem'
                        }
                      }}
                    />
                  )}
                </Box>
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        )}

        <Box sx={{ minHeight: 400 }}>
          {renderStepContent(activeStep)}
        </Box>

        {/* Navigation Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={handleBack}
              disabled={activeStep === 0 || isLoading}
              startIcon={<span>←</span>}
            >
              Paso Anterior
            </Button>
            
            {/* Botón Reiniciar Proceso cuando hay datos */}
            {(parseData || hasCompletedValidation) && (
              <Button
                variant="outlined"
                color="warning"
                onClick={handleReset}
                disabled={isLoading}
                size="small"
                sx={{ ml: 1 }}
              >
                Reiniciar Proceso
              </Button>
            )}
          </Box>
          
          <Typography variant="body2" color="text.secondary">
            Paso {activeStep + 1} de {steps.length}
          </Typography>
          
          {activeStep < steps.length - 1 && (
            <Button
              variant="outlined"
              onClick={handleNext}
              disabled={isLoading || 
                       (activeStep === 0 && !parseData) || 
                       (activeStep === 1 && !hasCompletedValidation)}
              endIcon={<span>→</span>}
            >
              Siguiente Paso
            </Button>
          )}
          
          {activeStep === steps.length - 1 && (
            <div /> // Spacer
          )}
        </Box>

{/* Botón de "Procesar Nuevo Archivo" removido - ahora usamos "Reiniciar Proceso" */}
      </Paper>
    </Box>
  );
};

export default EnsamblajeValidator;