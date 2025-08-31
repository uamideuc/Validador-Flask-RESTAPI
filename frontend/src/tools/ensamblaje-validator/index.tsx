import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Stepper, 
  Step, 
  StepLabel, 
  Button, 
  CircularProgress,
  Alert
} from '@mui/material';
import { useAuth } from '../../core/auth';
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
 */
const EnsamblajeValidator: React.FC<EnsamblajeValidatorProps> = ({ sessionId }) => {
  const { isAuthenticated, sessionId: authSessionId } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [uploadId, setUploadId] = useState<number | null>(null);
  const [parseData, setParseData] = useState<any>(null);
  const [validationResults, setValidationResults] = useState<any>(null);
  const [validationSessionId, setValidationSessionId] = useState<number | null>(null);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const currentSessionId = sessionId || authSessionId;

  useEffect(() => {
    if (!isAuthenticated) {
      setError('Debe estar autenticado para usar esta herramienta');
    }
  }, [isAuthenticated]);

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleFileUploaded = (data: any) => {
    setUploadId(data.upload_id);
    setError('');
  };

  const handleFileParsed = (data: any) => {
    setParseData(data);
    setError('');
    handleNext();
  };

  const handleCategorizationComplete = async (categorizationData: any) => {
    setIsLoading(true);
    setError('');
    
    try {
      // Import ApiService with new ToolKit methods
      const { default: ApiService } = await import('../../core/api');
      
      console.log('Categorization received:', categorizationData);
      console.log('Upload ID:', uploadId);
      
      // First, save the categorization to get validation_session_id
      if (!uploadId) {
        throw new Error('Upload ID not available');
      }
      
      const saveResult = await ApiService.saveCategorization(uploadId, categorizationData);
      console.log('Save categorization result:', saveResult);
      
      if (!saveResult.success) {
        throw new Error(saveResult.message || 'Error saving categorization');
      }
      
      // Now use the validation_session_id for ToolKit validation
      const validationResult = await ApiService.runToolValidation('ensamblaje', saveResult.validation_session_id);
      console.log('Validation result:', validationResult);
      
      if (validationResult.success) {
        setValidationResults(validationResult);
        setValidationSessionId(saveResult.validation_session_id);
        handleNext();
      } else {
        setError(validationResult.error || 'Error en validación');
      }
    } catch (error: any) {
      console.error('Error in categorization flow:', error);
      setError(error.message || 'Error ejecutando validación con ToolKit');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (exportType: string) => {
    if (!validationSessionId) {
      setError('No hay sesión de validación disponible para exportar');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
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
      } else {
        setError(exportResult.error || 'Error generando archivo de exportación');
      }
    } catch (error: any) {
      console.error('Error in export flow:', error);
      setError(error.message || 'Error ejecutando exportación');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setUploadId(null);
    setParseData(null);
    setValidationResults(null);
    setValidationSessionId(null);
    setError('');
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
        <Typography variant="h4" component="h1" gutterBottom>
          Validador de Instrumentos de Ensamblaje
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Herramienta especializada para validación de instrumentos educativos de tipo ensamblaje
        </Typography>
      </Paper>

      <Paper elevation={1} sx={{ p: 3 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
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
          <Button
            variant="outlined"
            onClick={handleBack}
            disabled={activeStep === 0 || isLoading}
            startIcon={<span>←</span>}
          >
            Paso Anterior
          </Button>
          
          <Typography variant="body2" color="text.secondary">
            Paso {activeStep + 1} de {steps.length}
          </Typography>
          
          {activeStep < steps.length - 1 && (
            <Button
              variant="outlined"
              onClick={handleNext}
              disabled={isLoading || 
                       (activeStep === 0 && !parseData) || 
                       (activeStep === 1 && !validationResults)}
              endIcon={<span>→</span>}
            >
              Siguiente Paso
            </Button>
          )}
          
          {activeStep === steps.length - 1 && (
            <div /> // Spacer
          )}
        </Box>

        {activeStep === steps.length - 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Button
              variant="contained"
              onClick={handleReset}
              size="large"
            >
              Procesar Nuevo Archivo
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default EnsamblajeValidator;