import React, { useState } from 'react';
import { Container, Typography, Box, Stepper, Step, StepLabel, Paper, Button, CircularProgress, Alert } from '@mui/material';
import FileUpload from './components/FileUpload';
import VariableCategorization from './components/VariableCategorization';
import ValidationReport from './components/ValidationReport.jsx';
import ApiService from './services/api';

interface AppState {
  step: number;
  uploadData: any;
  parseData: any;
  categorizationData: any;
  sessionId: number | null;
  validationData: any;
  loading: boolean;
  error: string | null;
}

const steps = [
  'Cargar Archivo',
  'Categorizar Variables',
  'Validar Datos',
  'Reporte Final'
];

function App() {
  const [state, setState] = useState<AppState>({
    step: 0,
    uploadData: null,
    parseData: null,
    categorizationData: null,
    sessionId: null,
    validationData: null,
    loading: false,
    error: null,
  });

  const handleFileUploaded = (uploadData: any) => {
    setState(prev => ({
      ...prev,
      uploadData,
      error: null,
    }));
  };

  const handleFileParsed = (parseData: any) => {
    setState(prev => ({
      ...prev,
      parseData,
      step: 1,
      error: null,
    }));
  };

  const handleCategorization = async (categorizationData: any) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Save categorization to backend
      const response = await ApiService.saveCategorization(
        state.uploadData.upload_id, 
        categorizationData
      );
      
      setState(prev => ({
        ...prev,
        categorizationData,
        sessionId: response.session_id,
        step: 2,
        loading: false,
      }));

      // Automatically run validation after saving categorization
      setTimeout(() => {
        runValidation(response.session_id);
      }, 1000);
      
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.response?.data?.error || 'Error al guardar categorización',
        loading: false,
      }));
    }
  };

  const runValidation = async (sessionId?: number) => {
    const currentSessionId = sessionId || state.sessionId;
    if (!currentSessionId) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await fetch('/api/validation/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: currentSessionId
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setState(prev => ({
          ...prev,
          validationData: data.validation_report,
          step: 3,
          loading: false,
        }));
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message || 'Error durante validación',
        loading: false,
      }));
    }
  };

  const handleExport = async (exportType: string) => {
    if (!state.sessionId) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      let exportResponse;
      
      switch (exportType) {
        case 'normalized_xlsx':
          exportResponse = await ApiService.exportNormalizedData(state.sessionId);
          break;
        case 'validation_excel':
          exportResponse = await ApiService.exportValidationExcel(state.sessionId);
          break;
        case 'validation_pdf':
          exportResponse = await ApiService.exportValidationPDF(state.sessionId);
          break;
        default:
          throw new Error('Tipo de exportación no válido');
      }
      
      if (exportResponse.success) {
        // Download the file with the correct filename
        await ApiService.downloadExport(exportResponse.export_id, exportResponse.filename);
      } else {
        throw new Error('Error en la exportación');
      }
      
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.response?.data?.error || error.message || 'Error durante exportación',
      }));
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const renderCurrentStep = () => {
    switch (state.step) {
      case 0:
        return (
          <FileUpload
            onFileUploaded={handleFileUploaded}
            onFileParsed={handleFileParsed}
          />
        );
      case 1:
        return (
          <VariableCategorization
            variables={state.parseData?.variables || []}
            sampleValues={state.parseData?.sample_values || {}}
            onCategorization={handleCategorization}
            uploadId={state.uploadData?.upload_id || 0}
            sheetName={state.parseData?.sheet_name}
          />
        );
      case 2:
        return (
          <Box>
            <Typography variant="h5" gutterBottom>
              Ejecutar Validaciones
            </Typography>
            <Typography variant="body1" gutterBottom>
              La categorización ha sido guardada. Ahora puedes ejecutar las validaciones de datos.
            </Typography>
            
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Validaciones que se ejecutarán:
              </Typography>
              <ul>
                <li>Validación de ítems duplicados por instrumento</li>
                <li>Validación de completitud de metadata</li>
                <li>Análisis de variables de clasificación</li>
              </ul>
              
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => runValidation()}
                  disabled={state.loading}
                  startIcon={state.loading ? <CircularProgress size={20} /> : null}
                >
                  {state.loading ? 'Ejecutando Validaciones...' : 'Ejecutar Validaciones'}
                </Button>
              </Box>
            </Paper>
          </Box>
        );
      case 3:
        return (
          <ValidationReport
            validationData={state.validationData}
            onExport={handleExport}
            sessionId={state.sessionId}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center">
          Validador de Instrumentos
        </Typography>
        <Typography variant="h6" component="h2" gutterBottom align="center" color="text.secondary">
          Herramienta para validar bases de datos de instrumentos educativos
        </Typography>
        
        {/* Progress Stepper */}
        <Paper sx={{ p: 3, mt: 4, mb: 4 }}>
          <Stepper activeStep={state.step} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>

        {/* Error Display */}
        {state.error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setState(prev => ({ ...prev, error: null }))}>
            {state.error}
          </Alert>
        )}

        {/* Navigation Buttons */}
        {state.step > 0 && (
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              variant="outlined"
              onClick={() => setState(prev => ({ ...prev, step: Math.max(0, prev.step - 1) }))}
              disabled={state.loading}
            >
              ← Paso Anterior
            </Button>
            <Typography variant="body2" color="text.secondary">
              Paso {state.step + 1} de {steps.length}
            </Typography>
            {state.step < 3 && (
              <Button
                variant="outlined"
                onClick={() => setState(prev => ({ ...prev, step: Math.min(3, prev.step + 1) }))}
                disabled={state.loading || (state.step === 1 && !state.categorizationData) || (state.step === 2 && !state.validationData)}
              >
                Siguiente Paso →
              </Button>
            )}
          </Box>
        )}

        {/* Current Step Content */}
        <Box sx={{ mt: 4 }}>
          {renderCurrentStep()}
        </Box>

        {/* Reset Button */}
        {state.step > 0 && (
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Button
              variant="text"
              color="secondary"
              onClick={() => setState({
                step: 0,
                uploadData: null,
                parseData: null,
                categorizationData: null,
                sessionId: null,
                validationData: null,
                loading: false,
                error: null,
              })}
            >
              🔄 Comenzar Nuevo Análisis
            </Button>
          </Box>
        )}

        {/* Debug Info (remove in production) */}
        {process.env.NODE_ENV === 'development' && (
          <Paper sx={{ p: 2, mt: 4, backgroundColor: '#f5f5f5' }}>
            <Typography variant="caption" display="block">
              Debug - Step: {state.step}
            </Typography>
            <Typography variant="caption" display="block">
              Upload Data: {state.uploadData ? '✓' : '✗'}
            </Typography>
            <Typography variant="caption" display="block">
              Parse Data: {state.parseData ? '✓' : '✗'}
            </Typography>
            <Typography variant="caption" display="block">
              Categorization: {state.categorizationData ? '✓' : '✗'}
            </Typography>
            <Typography variant="caption" display="block">
              Session ID: {state.sessionId || 'N/A'}
            </Typography>
            <Typography variant="caption" display="block">
              Validation Data: {state.validationData ? '✓' : '✗'}
            </Typography>
          </Paper>
        )}
      </Box>
    </Container>
  );
}

export default App;