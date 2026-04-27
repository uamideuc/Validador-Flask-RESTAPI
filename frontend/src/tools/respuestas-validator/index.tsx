import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Alert,
  Chip
} from '@mui/material';
import { useAuth } from '../../core/auth';
import { useRespuestasState } from '../../core/ToolStateContext';
import FileUpload from '../ensamblaje-validator/components/FileUpload';
import LdCUpload, { LdCSuggestedCategorization, runLdCMatching } from './components/LdCUpload';
import VariableCategorization from './components/VariableCategorization';
import ValidationReport from './components/ValidationReport';
import { LdCState, RespuestasItemConfig } from '../../core/ToolStateContext';

const steps = [
  'Subir Archivo',
  'Categorizar y Configurar',
  'Validar y Reportar'
];

const RespuestasValidator: React.FC = () => {
  const { isAuthenticated, sessionId: authSessionId } = useAuth();
  const { respuestasState, setRespuestasState, resetRespuestasState } = useRespuestasState();

  const {
    activeStep,
    uploadId,
    uploadedFilename,
    parseData,
    validationResults,
    validationSessionId,
    savedCategorization,
    hasCompletedValidation,
    error,
    isLoading
  } = respuestasState;

  useEffect(() => {
    if (!isAuthenticated) {
      setRespuestasState({ error: 'Debe estar autenticado para usar esta herramienta' });
    }
  }, [isAuthenticated, setRespuestasState]);

  const [ldcSuggested, setLdcSuggested] = useState<LdCSuggestedCategorization | null>(null);

  const handleFileUploaded = (data: any) => {
    setRespuestasState({
      uploadId: data.upload_id,
      uploadedFilename: data.filename,
      error: ''
    });
  };

  const handleFileParsed = (data: any) => {
    const newVariables: string[] = data.variables || [];
    const existingLdc = respuestasState.ldcState;

    // Re-hacer matching del LdC si ya estaba cargado antes que el archivo base
    let reMatchedConfigs: RespuestasItemConfig[] | undefined;
    let reMatchedSuggested: LdCSuggestedCategorization | undefined;
    if (existingLdc?.raw_rows?.length && existingLdc.mapping.name_column && existingLdc.mapping.values_column && existingLdc.mapping.missing_column) {
      const result = runLdCMatching(
        existingLdc.raw_rows,
        existingLdc.mapping.name_column,
        existingLdc.mapping.values_column,
        existingLdc.mapping.missing_column,
        newVariables
      );
      reMatchedConfigs = result.configs;
      reMatchedSuggested = result.suggested;
    }

    setRespuestasState({
      parseData: data,
      error: '',
      // Reset downstream validation state when new file is loaded
      validationResults: null,
      validationSessionId: null,
      savedCategorization: null,
      hasCompletedValidation: false,
      // Preserve LdC state; update itemConfigs from re-match if available
      ...(reMatchedConfigs !== undefined ? { itemConfigs: reMatchedConfigs } : { itemConfigs: [] }),
    });

    if (reMatchedSuggested) {
      setLdcSuggested(reMatchedSuggested);
    }
  };

  const handleLdCParsed = (state: LdCState, configs: RespuestasItemConfig[], suggested: LdCSuggestedCategorization) => {
    const merged = [
      ...respuestasState.itemConfigs.filter((c: RespuestasItemConfig) =>
        !configs.some((nc: RespuestasItemConfig) => nc.variable === c.variable)
      ),
      ...configs
    ];
    setRespuestasState({ ldcState: state, itemConfigs: merged });
    setLdcSuggested(suggested);
  };

  const handleLdCRemoved = () => {
    setRespuestasState({ ldcState: null });
  };

  const handleGoToCategorization = () => {
    setRespuestasState({ activeStep: 1 });
  };

  const handleCategorizationComplete = async (categorizationData: any) => {
    setRespuestasState({ isLoading: true, error: '' });

    try {
      const { default: ApiService } = await import('../../core/api');

      if (!uploadId) throw new Error('Upload ID no disponible');

      const saveResult = await ApiService.saveCategorization(uploadId, categorizationData);
      if (!saveResult.success) {
        throw new Error(saveResult.message || 'Error guardando categorización');
      }

      const validationResult = await ApiService.runToolValidation('respuestas', saveResult.validation_session_id);

      if (validationResult.success) {
        const categorizationForPersistence = {
          participant_id_vars: categorizationData.participant_id_vars,
          response_vars: categorizationData.response_vars,
          other_relevant_vars: categorizationData.other_relevant_vars,
          metadata_vars: categorizationData.metadata_vars,
          response_types: categorizationData.response_types ?? [],
        };

        setRespuestasState({
          validationResults: validationResult,
          validationSessionId: saveResult.validation_session_id,
          savedCategorization: categorizationForPersistence,
          hasCompletedValidation: true,
          activeStep: 2,
          isLoading: false
        });
      } else {
        setRespuestasState({
          error: validationResult.error || 'Error en validación',
          isLoading: false
        });
      }
    } catch (err: any) {
      console.error('Error in categorization flow:', err);
      setRespuestasState({
        error: err.message || 'Error ejecutando validación',
        isLoading: false
      });
    }
  };

  const handleExport = async (exportType: string) => {
    if (!validationSessionId) {
      setRespuestasState({ error: 'No hay sesión de validación para exportar' });
      return;
    }

    setRespuestasState({ isLoading: true, error: '' });

    try {
      const { default: ApiService } = await import('../../core/api');
      const exportResult = await ApiService.exportToolData('respuestas', validationSessionId, exportType);

      if (exportResult.success && exportResult.export_id) {
        await ApiService.downloadExport(exportResult.export_id, undefined, 'respuestas');
        setRespuestasState({ isLoading: false });
      } else {
        setRespuestasState({
          error: exportResult.error || 'Error generando exportación',
          isLoading: false
        });
      }
    } catch (err: any) {
      setRespuestasState({
        error: err.message || 'Error ejecutando exportación',
        isLoading: false
      });
    }
  };

  const handleNext = () => setRespuestasState({ activeStep: activeStep + 1 });
  const handleBack = () => setRespuestasState({ activeStep: activeStep - 1, error: '' });

  const handleReset = () => {
    resetRespuestasState();
  };

  if (!isAuthenticated) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Debe iniciar sesión para acceder al Validador de Respuestas
        </Alert>
      </Box>
    );
  }

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <FileUpload
              onFileUploaded={handleFileUploaded}
              onFileParsed={handleFileParsed}
            />
            <Box sx={{ mt: 3 }}>
              <LdCUpload
                ldcState={respuestasState.ldcState}
                onLdCParsed={handleLdCParsed}
                onLdCRemoved={handleLdCRemoved}
                responseVariables={parseData?.variables || []}
              />
              {parseData && (
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleGoToCategorization}
                    endIcon={<span>→</span>}
                  >
                    Continuar a Categorización
                  </Button>
                </Box>
              )}
            </Box>
          </Box>
        );
      case 1:
        return parseData ? (
          <VariableCategorization
            variables={parseData.variables}
            sampleValues={parseData.sample_values}
            onCategorization={handleCategorizationComplete}
            uploadId={uploadId!}
            sheetName={parseData.sheet_name}
            uploadedFilename={uploadedFilename}
            savedCategorization={savedCategorization}
            ldcSuggestedCategorization={ldcSuggested}
          />
        ) : null;
      case 2:
        return validationResults ? (
          <ValidationReport
            validationData={validationResults.validation_report}
            savedCategorization={savedCategorization}
            onExport={handleExport}
            isLoading={isLoading}
          />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, justifyContent: 'space-between' }}>
          <Typography variant="h4" component="h1">
            Validador de Bases de Datos de Respuestas
          </Typography>
          {(parseData || hasCompletedValidation) && activeStep < steps.length - 1 && (
            <Button
              variant="outlined"
              color="warning"
              onClick={handleReset}
              disabled={isLoading}
              startIcon={<span>↻</span>}
            >
              Reiniciar Proceso
            </Button>
          )}
        </Box>
        <Typography variant="body1" color="text.secondary">
          Herramienta especializada para validación de bases de datos de respuestas a instrumentos
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

        <Box sx={{ minHeight: 400 }}>
          {renderStepContent(activeStep)}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', mt: 3, position: 'relative' }}>
          <Box sx={{ position: 'absolute', left: 0 }}>
            {activeStep > 0 && (
              <Button
                variant="outlined"
                onClick={handleBack}
                disabled={isLoading}
                startIcon={<span>←</span>}
              >
                Paso Anterior
              </Button>
            )}
          </Box>

          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 500, py: 1, px: 2, borderRadius: 1, backgroundColor: 'action.hover' }}
            >
              Paso {activeStep + 1} de {steps.length}
            </Typography>
          </Box>

          <Box sx={{ position: 'absolute', right: 0 }}>
            {activeStep < steps.length - 1 ? (
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
            ) : (
              <Button
                variant="outlined"
                color="warning"
                onClick={handleReset}
                disabled={isLoading}
                startIcon={<span>↻</span>}
              >
                Reiniciar Proceso
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default RespuestasValidator;
