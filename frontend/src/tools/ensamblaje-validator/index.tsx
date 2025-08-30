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
import FileUpload from '../../components/FileUpload';
import DataPreview from '../../components/DataPreview';
import VariableCategorization from '../../components/VariableCategorization';
import ValidationReport from '../../components/ValidationReport.jsx';

const steps = [
  'Subir Archivo',
  'Vista Previa', 
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
  const [uploadData, setUploadData] = useState<any>(null);
  const [parseData, setParseData] = useState<any>(null);
  const [validationResults, setValidationResults] = useState<any>(null);
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

  const handleUploadSuccess = (data: any) => {
    setUploadData(data);
    setError('');
    handleNext();
  };

  const handleParseSuccess = (data: any) => {
    setParseData(data);
    setError('');
    handleNext();
  };

  const handleCategorizationComplete = async (data: any) => {
    setIsLoading(true);
    setError('');
    
    try {
      // Import ApiService with new ToolKit methods
      const { default: ApiService } = await import('../../core/api');
      
      // Use new ToolKit API for validation
      const validationResult = await ApiService.runToolValidation('ensamblaje', data.validation_session_id);
      
      if (validationResult.success) {
        setValidationResults(validationResult);
        handleNext();
      } else {
        setError(validationResult.error || 'Error en validación');
      }
    } catch (error) {
      setError('Error ejecutando validación con ToolKit');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setUploadData(null);
    setParseData(null);
    setValidationResults(null);
    setError('');
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setIsLoading(false);
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
            onUploadSuccess={handleUploadSuccess}
            onError={handleError}
            sessionId={currentSessionId}
          />
        );
      case 1:
        return uploadData ? (
          <DataPreview
            uploadData={uploadData}
            onParseSuccess={handleParseSuccess}
            onError={handleError}
            onNext={handleNext}
            onBack={handleBack}
          />
        ) : null;
      case 2:
        return parseData ? (
          <VariableCategorization
            parseData={parseData}
            onCategorizationComplete={handleCategorizationComplete}
            onError={handleError}
            onBack={handleBack}
          />
        ) : null;
      case 3:
        return validationResults ? (
          <ValidationReport
            validationData={validationResults.validation_report}
            onBack={handleBack}
            onReset={handleReset}
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